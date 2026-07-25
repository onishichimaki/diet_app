import ServiceWorkerRegistration from '@/components/ServiceWorkerRegistration';
import type {Metadata,Viewport} from 'next';import './globals.css';
export const metadata:Metadata={title:'Health Pocket',description:'毎日の食事・運動・睡眠をやさしく記録',manifest:'/manifest.webmanifest',appleWebApp:{capable:true,title:'Health Pocket'},icons:{apple:'/icon-192.png'}};
export const viewport:Viewport={themeColor:'#3d7a5a',width:'device-width',initialScale:1};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="ja"><body>{children}<ServiceWorkerRegistration/></body></html>}
