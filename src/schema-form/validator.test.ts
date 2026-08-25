import { test, expect, beforeEach, afterEach } from 'bun:test'
import {
  setSchemaValidator,
  getSchemaValidator,
  schemaValidationAvailable,
  warnNoValidator,
  warnCannotInfer,
  onSchemaValidatorChanged,
} from './validator'

/*
The NO-VALIDATOR path, which is the default for every ESM adopter.

Every other lane runs WITH a validator, because `tosijs-site.config.ts` sets
`bundleEntry: './src/index-iife.ts'` and that file registers one — so the doc tests, the
Playwright lane and the browser lane all exercise the configured case and none of them
exercised the default. That is the wrong way round for an optional dependency: the path
nobody tested was the path everybody gets first.

The seam is module-global, so each test restores it.
*/

const stub = { validate: () => true }
let warnings: string[] = []
const realWarn = console.warn

beforeEach(() => {
  setSchemaValidator(null)
  warnings = []
  console.warn = (...args: unknown[]) => warnings.push(args.join(' '))
})

afterEach(() => {
  console.warn = realWarn
  setSchemaValidator(null)
})

test('with nothing registered, validation is reported as unavailable', () => {
  expect(getSchemaValidator()).toBe(null)
  // The readable flag is the point: `validate() === true` cannot distinguish "this conforms"
  // from "nobody checked", and a Save handler needs to.
  expect(schemaValidationAvailable()).toBe(false)
})

test('registering one makes it available, and removing it makes it unavailable again', () => {
  setSchemaValidator(stub)
  expect(schemaValidationAvailable()).toBe(true)
  expect(getSchemaValidator()).toBe(stub)
  setSchemaValidator(null)
  expect(schemaValidationAvailable()).toBe(false)
})

test('the warning fires once, and names the component that needed it', () => {
  warnNoValidator('<tosi-schema-form>')
  warnNoValidator('<tosi-schema-form>')
  expect(warnings.length).toBe(1)
  expect(warnings[0]).toContain('<tosi-schema-form>')
  // It must be actionable, not just a complaint.
  expect(warnings[0]).toContain('setSchemaValidator')
  expect(warnings[0]).toContain('tosijs-schema')
})

test('no warning at all when a validator IS registered', () => {
  setSchemaValidator(stub)
  warnNoValidator('<tosi-schema-form>')
  expect(warnings).toEqual([])
})

test('REGRESSION: removing a validator un-suppresses the warning', () => {
  /*
  The flag used to reset only when a validator ARRIVED, so taking one away left every warning
  permanently silenced — the state in which the warning matters most was the one state that
  could not produce it.
  */
  setSchemaValidator(stub)
  setSchemaValidator(null)
  warnNoValidator('<tosi-schema-form>')
  expect(warnings.length).toBe(1)
})

test('REGRESSION: the warnings are per-reason, not one per process', () => {
  /*
  A single flag meant whichever component spoke first silenced the others: on a page where an
  editable table warned about validation, a form with no fields warned about nothing at all —
  and "why is this box empty" is the more urgent question.
  */
  warnNoValidator('an editable <tosi-table> with a schema')
  warnCannotInfer()
  expect(warnings.length).toBe(2)
  expect(warnings[1]).toContain('no fields to render')
})

test('the cannot-infer warning names the blank render, not the validation', () => {
  warnCannotInfer()
  expect(warnings[0]).toContain('no fields to render')
  // Describing the absence of error reporting while the user looks at an empty box names the
  // wrong problem at the exact moment they need the right one.
  expect(warnings[0]).not.toContain('nothing is being validated')
})

test('listeners are told when the validator changes', () => {
  let calls = 0
  onSchemaValidatorChanged(() => calls++)
  setSchemaValidator(stub)
  setSchemaValidator(null)
  expect(calls).toBe(2)
})
