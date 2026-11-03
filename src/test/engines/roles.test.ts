import { describe, expect, it } from 'vitest'
import { ROLE_ORDER, can, roleAtLeast, seesAllJobs, type Role } from '@/domain/auth/roles'

describe('role permissions', () => {
  it('gives technicians no management permissions', () => {
    expect(can('technician', 'jobs:create')).toBe(false)
    expect(can('technician', 'team:view')).toBe(false)
    expect(can('technician', 'admin:people')).toBe(false)
    expect(seesAllJobs('technician')).toBe(false)
  })

  it('lets supervisors assign work and see the live team', () => {
    expect(can('supervisor', 'jobs:create')).toBe(true)
    expect(can('supervisor', 'jobs:assign')).toBe(true)
    expect(can('supervisor', 'team:view')).toBe(true)
    expect(can('supervisor', 'team:analytics')).toBe(false)
    expect(can('supervisor', 'jobs:delete')).toBe(false)
    expect(can('supervisor', 'admin:people')).toBe(false)
  })

  it('adds team analytics and deletion to managers', () => {
    expect(can('manager', 'team:view')).toBe(true)
    expect(can('manager', 'team:analytics')).toBe(true)
    expect(can('manager', 'jobs:delete')).toBe(true)
    expect(can('manager', 'admin:people')).toBe(false)
    expect(can('manager', 'admin:audit')).toBe(false)
  })

  it('reserves people, audit and security for admins', () => {
    expect(can('admin', 'admin:people')).toBe(true)
    expect(can('admin', 'admin:audit')).toBe(true)
    expect(can('admin', 'admin:security')).toBe(true)
    expect(can('admin', 'team:analytics')).toBe(true)
    expect(seesAllJobs('admin')).toBe(true)
  })

  it('orders roles from technician to admin', () => {
    expect(ROLE_ORDER).toEqual(['technician', 'supervisor', 'manager', 'admin'])
    const order: Role[] = ['technician', 'supervisor', 'manager', 'admin']
    for (let index = 1; index < order.length; index += 1) {
      expect(roleAtLeast(order[index], order[index - 1])).toBe(true)
      expect(roleAtLeast(order[index - 1], order[index])).toBe(false)
    }
  })
})
