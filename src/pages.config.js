import Dashboard from './pages/Dashboard';
import Shop from './pages/Shop';
import Cart from './pages/Cart';
import RushMode from './pages/RushMode';
import Activewear from './pages/Activewear';
import Deliveries from './pages/Deliveries';
import Subscription from './pages/Subscription';
import Profile from './pages/Profile';
import Wearables from './pages/Wearables';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Dashboard": Dashboard,
    "Shop": Shop,
    "Cart": Cart,
    "RushMode": RushMode,
    "Activewear": Activewear,
    "Deliveries": Deliveries,
    "Subscription": Subscription,
    "Profile": Profile,
    "Wearables": Wearables,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};