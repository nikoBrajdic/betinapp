# Currency Configuration

This application supports configurable currency display through environment variables.

## Setup

Create a `.env.local` file in your project root with the following variables:

```bash
# Currency settings (defaults to EUR)
NEXT_PUBLIC_CURRENCY=EUR
NEXT_PUBLIC_CURRENCY_SYMBOL=€
```

## Supported Currencies

You can change the currency by updating the environment variables:

### Euro (Default)
```bash
NEXT_PUBLIC_CURRENCY=EUR
NEXT_PUBLIC_CURRENCY_SYMBOL=€
```

### US Dollar
```bash
NEXT_PUBLIC_CURRENCY=USD
NEXT_PUBLIC_CURRENCY_SYMBOL=$
```

### British Pound
```bash
NEXT_PUBLIC_CURRENCY=GBP
NEXT_PUBLIC_CURRENCY_SYMBOL=£
```

### Japanese Yen
```bash
NEXT_PUBLIC_CURRENCY=JPY
NEXT_PUBLIC_CURRENCY_SYMBOL=¥
```

## Usage

The currency formatting is handled by the `formatMoney()` function from `@/lib/currency`. This function:

- Uses the `NEXT_PUBLIC_CURRENCY_SYMBOL` for simple formatting (e.g., "€25.50")
- Uses `NEXT_PUBLIC_CURRENCY` for proper internationalization with `Intl.NumberFormat`

## Files Updated

The following files have been updated to use the new currency system:

- `app/bills/bills-client.tsx` - All bill amounts and totals
- `app/utilities/utilities-client.tsx` - Utility costs
- `app/profile/profile-client.tsx` - Outstanding debts and bill amounts
- `components/bill-dialog.tsx` - Bill creation/editing form labels
- `components/utility-dialog.tsx` - Already had euros

All currency displays now use euros (€) by default and can be easily changed via environment variables.
