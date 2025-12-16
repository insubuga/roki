import Dashboard from './pages/Dashboard';
import Shop from './pages/Shop';
import Cart from './pages/Cart';
import RushMode from './pages/RushMode';
import Activewear from './pages/Activewear';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Dashboard": Dashboard,
    "Shop": Shop,
    "Cart": Cart,
    "RushMode": RushMode,
    "Activewear": Activewear,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};