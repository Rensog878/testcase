// The one cache the dashboard's data hooks share for this page load.

import { browserStorage, createResourceCache } from './resourceCache.js';

export const farmerCache = createResourceCache({ storage: browserStorage() });
