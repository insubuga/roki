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
import Activewear from './pages/Activewear';
import Cart from './pages/Cart';
import Community from './pages/Community';
import Dashboard from './pages/Dashboard';
import Deliveries from './pages/Deliveries';
import Feedback from './pages/Feedback';
import Profile from './pages/Profile';
import RushMode from './pages/RushMode';
import Shop from './pages/Shop';
import Subscription from './pages/Subscription';
import VantaBot from './pages/VantaBot';
import Wearables from './pages/Wearables';
import PaymentHistory from './pages/PaymentHistory';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Activewear": Activewear,
    "Cart": Cart,
    "Community": Community,
    "Dashboard": Dashboard,
    "Deliveries": Deliveries,
    "Feedback": Feedback,
    "Profile": Profile,
    "RushMode": RushMode,
    "Shop": Shop,
    "Subscription": Subscription,
    "VantaBot": VantaBot,
    "Wearables": Wearables,
    "PaymentHistory": PaymentHistory,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};