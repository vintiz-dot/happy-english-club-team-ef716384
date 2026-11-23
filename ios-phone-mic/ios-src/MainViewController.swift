// Capacitor registers plugins that live inside the app (not in an npm
// package) only when told to: this view controller does it. Main.storyboard's
// view controller must use this class (scripts/setup-ios.sh sets it).

import UIKit
import Capacitor

class MainViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(HecPhoneMicPlugin())
    }
}
