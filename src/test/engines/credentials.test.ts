import { describe, expect, it } from 'vitest'
import { hashPin, timingSafeEqual, verifyPin } from '@/domain/auth/credentials'
import { authenticateEmployee } from '@/data/employees'

describe('PIN hashing', () => {
  it('verifies the right PIN and rejects the wrong one', async () => {
    const credential = await hashPin('4821', undefined, 1000)
    expect(credential.hash).not.toContain('4821')
    expect(await verifyPin('4821', credential)).toBe(true)
    expect(await verifyPin('4822', credential)).toBe(false)
    expect(await verifyPin('', credential)).toBe(false)
  })

  it('never produces the same hash twice for the same PIN', async () => {
    const first = await hashPin('1234', undefined, 1000)
    const second = await hashPin('1234', undefined, 1000)
    expect(first.salt).not.toBe(second.salt)
    expect(first.hash).not.toBe(second.hash)
  })

  it('fails closed when a credential is corrupted or crypto is missing', async () => {
    expect(await verifyPin('1234', { salt: '!!!', hash: 'x', iterations: 1000 })).toBe(false)
  })

  it('compares strings in constant time', () => {
    expect(timingSafeEqual('abcd', 'abcd')).toBe(true)
    expect(timingSafeEqual('abcd', 'abce')).toBe(false)
    expect(timingSafeEqual('abcd', 'abc')).toBe(false)
  })
})

describe('demo employee directory', () => {
  it('signs in the demo technician and manager with hashed PINs', async () => {
    expect((await authenticateEmployee('EMP-1042', '1234'))?.role).toBe('technician')
    expect((await authenticateEmployee(' mgr-1001 ', '1234'))?.name).toBe('Priya Menon')
  })

  it('rejects the wrong PIN and unknown employee IDs', async () => {
    expect(await authenticateEmployee('EMP-1042', '9999')).toBeNull()
    expect(await authenticateEmployee('EMP-0000', '1234')).toBeNull()
  })
})
