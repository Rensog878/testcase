import { useEffect, useState } from 'react'
import axios from 'axios'

export default function AdminEnquiries() {
  const [enquiries, setEnquiries] = useState([])

  useEffect(() => {
    axios.get('/api/enquiries')
      .then(({ data }) => setEnquiries(data.data || []))
      .catch(() => setEnquiries([]))
  }, [])

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div><h1>📝 Farmer Enquiries</h1><p>{enquiries.length.toLocaleString()} enquiries received</p></div>
      </div>
      <div className="card">
        <div className="table-wrap">
          <table>
            <thead><tr><th>#</th><th>Farmer</th><th>Phone</th><th>Location</th><th>Crop</th><th>Type</th><th>Message</th><th>Date</th></tr></thead>
            <tbody>
              {enquiries.map((e, i) => (
                <tr key={e.id || i}>
                  <td style={{ color: 'var(--text-muted)' }}>{i + 1}</td>
                  <td style={{ fontWeight: 600 }}>{e.name}</td>
                  <td><span className="badge badge-green">📱 {e.phone}</span></td>
                  <td>{e.location}</td>
                  <td>{e.crop || '—'}</td>
                  <td><span className="badge badge-blue">{e.type}</span></td>
                  <td style={{ maxWidth: 280, whiteSpace: 'pre-wrap' }}>{e.message || '—'}</td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{new Date(e.createdAt).toLocaleDateString('en-IN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
