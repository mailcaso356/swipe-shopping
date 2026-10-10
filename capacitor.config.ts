import type { CapacitorConfig } from '@capacitor/cli'

// App Android/iOS: lo stesso sito impacchettato. Il catalogo si scarica sempre da swipeshopping.app
// (vedi src/lib/native.ts), così l'app resta aggiornata senza pubblicare una nuova versione.
const config: CapacitorConfig = {
  appId: 'app.swipeshopping',
  appName: 'Swipe Shopping',
  webDir: 'dist',
  backgroundColor: '#fafafa',
  plugins: {
    SplashScreen: {
      launchShowDuration: 800,
      backgroundColor: '#ffffff',
      showSpinner: false,
    },
  },
}

export default config
