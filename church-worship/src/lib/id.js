import { nanoid } from 'nanoid'

export const uid = (prefix = '') => (prefix ? `${prefix}_${nanoid(8)}` : nanoid(10))
