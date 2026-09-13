export default function Skeleton({ lines = 4 }) {
  return (
    <div className="fd-skeleton" aria-hidden="true">
      {Array.from({ length: lines }, (_, index) => <span key={index} className="fd-skeleton-line" />)}
    </div>
  )
}
