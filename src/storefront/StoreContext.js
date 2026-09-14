import { createContext, useContext } from 'react'

// The storefront's actions (basket, filters, popups, menu, sign-in). The value
// never changes, so sections re-render only when their own props change.
export const StoreContext = createContext(null)

export const useStore = () => useContext(StoreContext)
