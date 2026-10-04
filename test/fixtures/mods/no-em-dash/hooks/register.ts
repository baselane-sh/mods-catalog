import type { Register } from 'claude-code'

import { registerStyles } from './engine'
import { rule as noEmDash } from './rules/no-em-dash'

export const register: Register = (on, options) => registerStyles(on, [noEmDash], options)
