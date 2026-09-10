# Currency display

Household bills are recorded in EUR. Display helpers live in `lib/currency.ts`.

- `formatMoney(amount)` and `formatCurrencySymbol(amount)` prepend the symbol
  and show two decimals, such as `€25.50`.
- `formatCurrency(amount)` uses `Intl.NumberFormat` with the configured code.

Optional build-time variables default to:

```text
NEXT_PUBLIC_CURRENCY=EUR
NEXT_PUBLIC_CURRENCY_SYMBOL=€
```

If configuring another currency, change both values and rebuild. These settings
only change display: they do not convert stored amounts or record a currency
per bill. The helpers currently always use two decimals.
