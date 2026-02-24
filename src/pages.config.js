/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import AdminDashboard from './pages/AdminDashboard';
import Cart from './pages/Cart';
import Configuration from './pages/Configuration';
import Dashboard from './pages/Dashboard';
import Deliveries from './pages/Deliveries';
import DriverApplicationReview from './pages/DriverApplicationReview';
import DriverDashboard from './pages/DriverDashboard';
import DriverOnboarding from './pages/DriverOnboarding';
import Feedback from './pages/Feedback';
import LaundryOrder from './pages/LaundryOrder';
import Network from './pages/Network';
import Onboarding from './pages/Onboarding';
import OperationsView from './pages/OperationsView';
import OrderHistory from './pages/OrderHistory';
import PaymentHistory from './pages/PaymentHistory';
import Performance from './pages/Performance';
import Profile from './pages/Profile';
import RiskRecovery from './pages/RiskRecovery';
import RokiBot from './pages/RokiBot';
import RushMode from './pages/RushMode';
import Schedule from './pages/Schedule';
import Shop from './pages/Shop';
import Subscription from './pages/Subscription';
import Support from './pages/Support';
import SupportAdmin from './pages/SupportAdmin';
import Wearables from './pages/Wearables';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AdminDashboard": AdminDashboard,
    "Cart": Cart,
    "Configuration": Configuration,
    "Dashboard": Dashboard,
    "Deliveries": Deliveries,
    "DriverApplicationReview": DriverApplicationReview,
    "DriverDashboard": DriverDashboard,
    "DriverOnboarding": DriverOnboarding,
    "Feedback": Feedback,
    "LaundryOrder": LaundryOrder,
    "Network": Network,
    "Onboarding": Onboarding,
    "OperationsView": OperationsView,
    "OrderHistory": OrderHistory,
    "PaymentHistory": PaymentHistory,
    "Performance": Performance,
    "Profile": Profile,
    "RiskRecovery": RiskRecovery,
    "RokiBot": RokiBot,
    "RushMode": RushMode,
    "Schedule": Schedule,
    "Shop": Shop,
    "Subscription": Subscription,
    "Support": Support,
    "SupportAdmin": SupportAdmin,
    "Wearables": Wearables,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};