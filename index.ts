import { registerRootComponent } from "expo";

import "./src/services/backup/backgroundBackupTask";
import "./src/services/tracking/locationTracking";
import App from "./App";

registerRootComponent(App);
