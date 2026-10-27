import {startPwa} from './pwa-runtime';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './style.css';
import './interactions.css';
import './controls.css';
import './mobile.css';
class AppBoundary extends React.Component<{children:React.ReactNode},{failed:boolean}>{
 state={failed:false};
 static getDerivedStateFromError(){return {failed:true};}
 componentDidCatch(){window.dispatchEvent(new Event('ritmo-boot-failed'));}
 render(){return this.state.failed?null:this.props.children;}
}
function AppReady(){React.useEffect(()=>{window.dispatchEvent(new Event('ritmo-app-ready'));},[]);return null;}
ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><AppBoundary><App /><AppReady/></AppBoundary></React.StrictMode>);

startPwa();

