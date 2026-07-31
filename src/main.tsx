import React from 'react'
import ReactDOM from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App'
import './index.css'
import { ensureSeedData } from './db/repository'
import { reconcileExerciseTimer } from './lib/useClock'
import { applyLocaleToDocument, useAppStore } from './stores/appStore'

// Direction has to be right before React paints, otherwise the first frame
// renders LTR and visibly snaps into place.
applyLocaleToDocument(useAppStore.getState().locale)
useAppStore.subscribe((state) => applyLocaleToDocument(state.locale))

// Ask Safari not to evict the database during its routine housekeeping. It can
// refuse — Settings surfaces the outcome, and export exists for when it does.
void navigator.storage?.persist?.()

// Seeds the built-in food table on a cold install and repairs it if it was ever
// cleared out from under us.
void ensureSeedData()

// A persisted exercise timer can outlive its owning set row; left alone it
// would keep every duration exercise's Start button disabled.
void reconcileExerciseTimer()

registerSW({ immediate: true })

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
