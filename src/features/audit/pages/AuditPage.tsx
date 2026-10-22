// Stub. It exists to prove the Auditor-only route guard (RequireRole) end to end. The read-only
// audit view arrives with the Audit module (EP-03), so there is no data to show yet.
export default function AuditPage() {
  return (
    <section>
      <h1>Audit</h1>
      <p>The read-only audit view is not built yet. It arrives with the audit module.</p>
    </section>
  )
}
