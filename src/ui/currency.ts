/** The game's money, named in one place (the protocol field is `aurel`). */
export const CURRENCY = { name: 'Aurel', short: 'A' };

/** 4200 -> "4,200 A" (a no-break space keeps the unit with the number). */
export const money = (n: number) => n.toLocaleString() + ' ' + CURRENCY.short;
