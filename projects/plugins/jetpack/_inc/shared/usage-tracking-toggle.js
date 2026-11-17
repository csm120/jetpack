import apiFetch from '@wordpress/api-fetch';
import { __, sprintf } from '@wordpress/i18n';

const PATH = '/jetpack/v4/tracking/settings';

/**
 * Wire the Profile page's usage tracking checkbox to the user's WordPress.com setting.
 *
 * The endpoint relays WordPress.com's answer with a 200 even when WordPress.com failed, so the body decides.
 *
 * @param {HTMLElement} root - The Profile page section, holding the hidden checkbox label, a spinner and a status line.
 * @return {Promise<void>} Resolves once the setting has loaded, or failed to.
 */
export async function initUsageTrackingToggle( root ) {
	const checkbox = root.querySelector( 'input[type="checkbox"]' );
	const spinner = root.querySelector( '.spinner' );
	const status = root.querySelector( '[role="status"]' );
	const setBusy = isBusy => {
		checkbox.disabled = isBusy;
		spinner?.classList.toggle( 'is-active', isBusy );
	};

	setBusy( true );
	status.textContent = __( 'Loading…', 'jetpack' );
	try {
		const settings = await apiFetch( { path: PATH } );
		if ( typeof settings?.tracks_opt_out !== 'boolean' ) {
			throw new Error( 'Unexpected tracking settings response.' );
		}
		checkbox.checked = ! settings.tracks_opt_out;
	} catch {
		spinner?.classList.remove( 'is-active' );
		status.textContent = __(
			'Your usage information setting could not be loaded. You can still change it on WordPress.com.',
			'jetpack'
		);
		return;
	}
	// Shown only once loaded, so a failure never passes for "not sharing".
	checkbox.closest( 'label' ).hidden = false;
	status.textContent = '';
	setBusy( false );

	checkbox.addEventListener( 'change', async () => {
		const optOut = ! checkbox.checked;
		setBusy( true );
		status.textContent = __( 'Updating privacy settings…', 'jetpack' );
		try {
			const saved = await apiFetch( {
				path: PATH,
				method: 'POST',
				data: { tracks_opt_out: optOut },
			} );
			if (
				! saved ||
				saved.code !== undefined ||
				( typeof saved.tracks_opt_out === 'boolean' && saved.tracks_opt_out !== optOut )
			) {
				throw saved ?? new Error( 'Empty tracking settings response.' );
			}
			// Sets this browser's Tracks opt-out cookie.
			window._tkq = window._tkq || [];
			window._tkq.push( [ 'setOptOut', optOut ] );
			status.textContent = __( 'Updated privacy settings.', 'jetpack' );
		} catch ( error ) {
			checkbox.checked = optOut;
			status.textContent = sprintf(
				/* translators: %s: an error message. */
				__( 'Error updating privacy settings. %s', 'jetpack' ),
				error?.message || error?.code || ''
			);
		}
		setBusy( false );
	} );
}
