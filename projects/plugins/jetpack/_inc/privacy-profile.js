import { initUsageTrackingToggle } from './shared/usage-tracking-toggle';

const root = document.getElementById( 'jetpack-privacy' );

if ( root?.querySelector( 'input[type="checkbox"]' ) ) {
	initUsageTrackingToggle( root );
}
