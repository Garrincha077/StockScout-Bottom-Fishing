import{defineConfig}from'vite'
import react from'@vitejs/plugin-react'
export default defineConfig({base:'/StockScout-Bottom-Fishing/',plugins:[react()],build:{target:'es2022',rollupOptions:{output:{manualChunks:{react:['react','react-dom'],'supabase':['@supabase/supabase-js'],charts:['lightweight-charts']}}}}})
