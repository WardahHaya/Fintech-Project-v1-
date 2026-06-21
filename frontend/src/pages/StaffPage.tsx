import { CheckCircle2, Shield, ShieldCheck, UserPlus2, XCircle } from 'lucide-react'
import { useEffect, useState } from 'react'

import { createStaffUser, fetchUsers, updateStaffUser } from '../lib/api'
import type { StaffCreatePayload, UserProfile } from '../types'


const defaultForm: StaffCreatePayload = {
  email: '',
  password: '',
  full_name: '',
  role: 'admin',
}


export function StaffPage() {
  const [users, setUsers] = useState<UserProfile[]>([])
  const [form, setForm] = useState<StaffCreatePayload>(defaultForm)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    let active = true

    async function loadUsers() {
      try {
        const response = await fetchUsers()
        if (!active) {
          return
        }
        setUsers(response)
      } catch {
        if (!active) {
          return
        }
        setError('Staff accounts could not be loaded.')
      }
    }

    void loadUsers()

    return () => {
      active = false
    }
  }, [])

  async function refreshUsers() {
    const response = await fetchUsers()
    setUsers(response)
  }

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)
    setError('')
    setSuccess('')

    try {
      await createStaffUser(form)
      setForm(defaultForm)
      setSuccess('Staff account created.')
      await refreshUsers()
    } catch {
      setError('The staff account could not be created.')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleToggle(user: UserProfile) {
    setError('')
    setSuccess('')
    try {
      await updateStaffUser(user.id, { is_active: !user.is_active })
      await refreshUsers()
    } catch {
      setError('The staff account could not be updated.')
    }
  }

  return (
    <div className="space-y-6">
      <section className="surface-card px-6 py-8 sm:px-8">
        <span className="eyebrow">Admin staff console</span>
        <h2 className="mt-5 text-4xl font-semibold tracking-[-0.04em] text-navy">
          Manage access to the Tiqmo operations platform.
        </h2>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-slate">
          Create and maintain administrative access without touching the agent logic.
        </p>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="surface-card p-6">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate">Staff directory</p>
              <h3 className="text-2xl font-semibold text-navy">Current accounts</h3>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-y-3">
              <thead>
                <tr className="text-left text-[11px] font-semibold uppercase tracking-[0.24em] text-slate">
                  <th className="px-4">Staff</th>
                  <th className="px-4">Role</th>
                  <th className="px-4">Status</th>
                  <th className="px-4">Action</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="rounded-2xl bg-background">
                    <td className="rounded-l-2xl px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                          <Shield className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-navy">{user.full_name}</p>
                          <p className="text-sm text-slate">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="inline-flex rounded-full border border-primary/10 bg-primary/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                        admin
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className={['inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]', user.is_active ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'].join(' ')}>
                        {user.is_active ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                        {user.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="rounded-r-2xl px-4 py-4">
                      <button type="button" onClick={() => void handleToggle(user)} className="action-secondary">
                        {user.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="surface-card p-6">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/10 text-accent">
              <UserPlus2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate">Add staff</p>
              <h3 className="text-2xl font-semibold text-navy">Create an account</h3>
            </div>
          </div>

          <form className="space-y-4" onSubmit={handleCreate}>
            <label className="block">
              <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.24em] text-slate">Full name</span>
              <input
                value={form.full_name}
                onChange={(event) => setForm((current) => ({ ...current, full_name: event.target.value }))}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-navy outline-none focus:border-primary"
                placeholder="Team member name"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.24em] text-slate">Email</span>
              <input
                type="email"
                value={form.email}
                onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-navy outline-none focus:border-primary"
                placeholder="name@tiqmo.sa"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.24em] text-slate">Temporary password</span>
              <input
                type="password"
                value={form.password}
                onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-navy outline-none focus:border-primary"
                placeholder="Minimum 8 characters"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.24em] text-slate">Access level</span>
              <div className="w-full rounded-2xl border border-slate-200 bg-background px-4 py-3 text-sm font-semibold text-navy">
                Admin
              </div>
            </label>

            {error ? (
              <div className="rounded-2xl border border-danger/15 bg-danger/5 px-4 py-3 text-sm text-danger">
                {error}
              </div>
            ) : null}
            {success ? (
              <div className="rounded-2xl border border-success/15 bg-success/5 px-4 py-3 text-sm text-success">
                {success}
              </div>
            ) : null}

            <button type="submit" disabled={isSubmitting} className="action-primary w-full justify-center">
              {isSubmitting ? 'Creating account...' : 'Create staff account'}
            </button>
          </form>
        </div>
      </section>
    </div>
  )
}
