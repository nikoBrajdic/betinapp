import { test } from 'node:test'
import assert from 'node:assert/strict'
import { type Bill, computeBillShares, dayIndex, netSettlements, selectedSplitGuests, summarizeGuestsForBillPeriod } from '../lib/bill-splitting'

const bill: Bill = {
  id: 'bill', name: 'Internet', amount: 90, due_date: '2026-09-01', period_end: null,
  paid: false, paid_by: 'Niko', split_preset: 'equal', split_between: ['Niko', 'Matea', 'Vesna'],
  category: 'utilities', recurring: true,
}

test('fixed participants remain independent of stays', () => {
  const guests = selectedSplitGuests(bill, 'Niko', [{ name: 'Visitor', days: 7 }], new Set(bill.split_between))
  assert.deepEqual(guests.map(g => g.name), ['Matea', 'Vesna'])
  const shares = computeBillShares(bill, 'Niko', true, 30, guests)
  assert.equal(shares.payerShare, 30)
  assert.equal(shares.guestShares.get('Matea'), 30)
})

test('excluded payer receives no share, even in equal mode', () => {
  const shares = computeBillShares(bill, 'Niko', false, 30, [{ name: 'Matea', days: 0 }])
  assert.equal(shares.payerShare, 0)
  assert.equal(shares.guestShares.get('Matea'), 90)
})

test('checkout is exclusive; month crossings and repeated stays count nights', () => {
  const stays = [
    { id: '1', guest_name: 'Matea', from_date: '2026-08-29', to_date: '2026-09-03' },
    { id: '2', guest_name: 'Matea', from_date: '2026-09-29', to_date: '2026-10-04' },
    { id: '3', guest_name: 'Niko', from_date: '2026-08-28', to_date: '2026-09-01' },
    { id: '4', guest_name: 'Vesna', from_date: '2026-09-10', to_date: '2026-09-11' },
  ]
  assert.deepEqual(summarizeGuestsForBillPeriod(stays, '2026-09-01', '2026-09-30', '2026-10-01'), [
    { name: 'Matea', days: 4 }, { name: 'Vesna', days: 30 },
  ])
  assert.equal(dayIndex('2026-03-30') - dayIndex('2026-03-28'), 2)
  assert.equal(dayIndex('2028-03-01') - dayIndex('2028-02-01'), 29)
})

test('weighted and nightly splits preserve the total', () => {
  for (const preset of ['default', 'weighted'] as const) {
    const shares = computeBillShares({ ...bill, split_preset: preset, split_weights: { Niko: 2, Matea: 1 } }, 'Niko', true, 30, [{ name: 'Matea', days: 10 }])
    assert.ok(Math.abs(shares.payerShare + shares.guestShares.get('Matea')! - bill.amount) < 1e-9)
  }
})

test('settlement cancels reciprocal debts and reverses a negative balance', () => {
  assert.deepEqual(netSettlements(new Map([['Niko::Vesna', 20], ['Vesna::Niko', 35]])), [
    { debtor: 'Vesna', creditor: 'Niko', amount: 15 },
  ])
  assert.deepEqual(netSettlements(new Map([['Niko::Vesna', 20], ['Vesna::Niko', 20]])), [])
})

test('overlapping rows for one guest count each night once', () => {
  const stays = [
    { id: '1', guest_name: 'Matea', from_date: '2026-09-01', to_date: '2026-09-10' },
    { id: '2', guest_name: 'Matea', from_date: '2026-09-05', to_date: '2026-09-15' },
    { id: '3', guest_name: 'Matea', from_date: '2026-09-07', to_date: '2026-09-09' },
  ]
  assert.equal(summarizeGuestsForBillPeriod(stays, '2026-09-01', '2026-09-30', '2026-10-01')[0].days, 14)
})
