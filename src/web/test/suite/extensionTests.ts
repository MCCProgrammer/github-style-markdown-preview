// Entry point for the tests
// The testBundlePlugin in esbuild.js replaces this content at build time,
// but keeping the export here means it still works if the plugin isn't active
export { run } from './mochaTestRunner';
import './extension.test';

