import { countries } from "countries-list"

/**
 * Full list of country names for the Discover country filter.
 *
 * The backend stores/filters country as a `Locale`-derived English display name
 * (CLDR), so the dropdown MUST use the same naming or an equals-match filter
 * would miss. We take the ISO codes from `countries-list` and resolve each name
 * via `Intl.DisplayNames(['en'], {type:'region'})` — the browser's CLDR data,
 * which matches Java's. Falls back to the library's own name if Intl is absent.
 */

const displayNames =
  typeof Intl !== "undefined" && "DisplayNames" in Intl
    ? new Intl.DisplayNames(["en"], { type: "region" })
    : null

/** Sorted list of every country name (CLDR English). */
export const ALL_COUNTRY_NAMES: string[] = (() => {
  const names = (Object.keys(countries) as Array<keyof typeof countries>)
    .map((code) => {
      let name: string | undefined
      try {
        name = displayNames?.of(code as string)
      } catch {
        name = undefined
      }
      return name || countries[code]?.name
    })
    .filter((n): n is string => Boolean(n))
  return Array.from(new Set(names)).sort((a, b) => a.localeCompare(b))
})()

/** Country options for the filter dropdown — "All" first, then every country. */
export const COUNTRY_FILTER_OPTIONS: string[] = ["All", ...ALL_COUNTRY_NAMES]
