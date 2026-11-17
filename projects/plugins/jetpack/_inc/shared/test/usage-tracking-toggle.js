import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import apiFetch from '@wordpress/api-fetch';
import { initUsageTrackingToggle } from '../usage-tracking-toggle';

jest.mock( '@wordpress/api-fetch', () => jest.fn() );

const buildSection = () => {
	document.body.innerHTML = `
		<div data-testid="section">
			<span class="spinner"></span>
			<label hidden><input type="checkbox" /> Share information</label>
			<p role="status"></p>
		</div>`;
	return screen.getByTestId( 'section' );
};

describe( 'initUsageTrackingToggle', () => {
	afterEach( () => {
		apiFetch.mockReset();
		delete window._tkq;
	} );

	it.each( [
		[ 'checks', false, { checked: true } ],
		[ 'unchecks', true, { checked: false } ],
	] )( '%s the box when tracks_opt_out is %s', async ( _verb, optOut, state ) => {
		apiFetch.mockResolvedValueOnce( { tracks_opt_out: optOut } );

		await initUsageTrackingToggle( buildSection() );

		expect( screen.getByRole( 'checkbox', state ) ).toBeEnabled();
	} );

	it( 'keeps the box hidden when WordPress.com answers without the setting', async () => {
		apiFetch.mockResolvedValueOnce( { code: 'unknown_token' } );

		await initUsageTrackingToggle( buildSection() );

		expect( screen.queryByRole( 'checkbox' ) ).not.toBeInTheDocument();
		expect( screen.getByRole( 'status' ) ).toHaveTextContent( 'could not be loaded' );
	} );

	it( 'saves the opt-out and sets the opt-out cookie when unchecked', async () => {
		apiFetch
			.mockResolvedValueOnce( { tracks_opt_out: false } )
			.mockResolvedValueOnce( { tracks_opt_out: true } );
		await initUsageTrackingToggle( buildSection() );

		await userEvent.click( screen.getByRole( 'checkbox' ) );

		await waitFor( () => expect( screen.getByRole( 'checkbox' ) ).toBeEnabled() );
		expect( apiFetch ).toHaveBeenLastCalledWith( {
			path: '/jetpack/v4/tracking/settings',
			method: 'POST',
			data: { tracks_opt_out: true },
		} );
		expect( window._tkq ).toEqual( [ [ 'setOptOut', true ] ] );
	} );

	it.each( [
		[ 'the request fails', () => apiFetch.mockRejectedValueOnce( { message: 'Nope.' } ) ],
		[
			'WordPress.com answers with an error',
			() => apiFetch.mockResolvedValueOnce( { code: 'nope', message: 'Nope.' } ),
		],
		[ 'WordPress.com answers with nothing', () => apiFetch.mockResolvedValueOnce( null ) ],
	] )( 'puts the box back when %s', async ( _when, failSave ) => {
		apiFetch.mockResolvedValueOnce( { tracks_opt_out: false } );
		failSave();
		await initUsageTrackingToggle( buildSection() );

		await userEvent.click( screen.getByRole( 'checkbox' ) );

		await waitFor( () => expect( screen.getByRole( 'checkbox' ) ).toBeEnabled() );
		expect( screen.getByRole( 'checkbox' ) ).toBeChecked();
		expect( screen.getByRole( 'status' ) ).toHaveTextContent( 'Error updating privacy settings.' );
		expect( window._tkq ).toBeUndefined();
	} );
} );
