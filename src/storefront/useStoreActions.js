import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCheckoutActions } from '../hooks/useCheckout'
import { useStore } from './StoreContext'

/**
 * The header's actions, wherever the header is rendered.
 *
 * On the home page the catalogue is on the page, so searching, picking a
 * category or picking a crop filter it in place and scroll down to it -
 * Storefront.jsx puts those actions on StoreContext. On every other page
 * there is no catalogue to filter, so the same controls go to /products with
 * the filter in the URL, which is where that page reads it from.
 *
 * Both used to be written out in full, in two headers that had to be kept in
 * step by hand. The header is one component now and asks for its actions
 * here; this returns the page's own if it has them, and navigation that does
 * the same job if it does not.
 */
export function useStoreActions() {
  const store = useStore()
  const navigate = useNavigate()
  const { openBasket, showAccount } = useCheckoutActions()
  // Only used when there is no catalogue on the page: what has been typed in
  // the header's search box before it is submitted.
  const [typed, setTyped] = useState('')

  return useMemo(() => {
    if (store) return { ...store, searchText: undefined, offPage: false }

    const goProducts = params => {
      const query = new URLSearchParams(Object.entries(params).filter(([, value]) => value)).toString()
      navigate(query ? `/products?${query}` : '/products')
    }

    return {
      offPage: true,
      searchText: typed,
      setFilter: (name, value) => {
        if (name === 'search') { setTyped(value); return }
        goProducts({ [name]: value })
      },
      // The catalogue lives on /products here, so "show me the catalogue"
      // means going there with whatever has been typed.
      scrollToCatalog: () => goProducts({ search: typed }),
      filterByCategory: category => goProducts({ category }),
      filterByCrop: crop => goProducts({ crop }),
      handleAccountClick: event => showAccount(event),
      handleBasketClick: () => openBasket(),
      goTo: path => navigate(path),
      openProductPage: id => navigate(`/product/${encodeURIComponent(id)}`),
      addToCart: () => {},
      openSignIn: () => showAccount(),
      toggleFilterDrawer: () => {},
      resetFilters: () => {},
    }
  }, [store, navigate, openBasket, showAccount, typed])
}
