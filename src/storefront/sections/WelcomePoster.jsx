import { memo } from 'react'
import { useStore } from '../StoreContext'
import { WHATSAPP_EXPERT_URL } from '../data'
import Modal from './Modal'

// On phones the poster is a card docked above the bottom bar; a downward
// swipe from the top of its text closes it.
const posterScroller = card => card.querySelector('.welcome-poster-body')

export default memo(function WelcomePoster({ state }) {
  const { closeModal } = useStore()
  const close = () => closeModal('welcomePosterModal')

  return (
    <Modal
      id="welcomePosterModal"
      state={state}
      cardClassName="modal-card welcome-poster-card"
      closeProps={{ title: 'Close & see website', 'aria-label': 'Close poster' }}
      getSwipeScroller={posterScroller}
    >
      <div className="welcome-poster-header">
        <div className="welcome-poster-leaf">🌱</div>
        <div className="welcome-poster-brand">SATHYAM <span>BIO</span></div>
        <div className="welcome-poster-tagline">Agro Pesticides &amp; Crop Advisory</div>
        <div className="welcome-poster-badge">
          <i className="fa-solid fa-heart" style={{ color: '#f87171' }}></i> We Care For You
        </div>
      </div>

      <div className="welcome-poster-body">
        <span className="welcome-poster-tag">🌟 Farmer Advisory Platform</span>
        <h2 className="welcome-poster-title">Welcome to the Personalized Farming Experience!</h2>
        <p className="welcome-poster-text">
          “Welcome to the personalized farming experience that you can do farming with our expert with daily updates. We care for you!”
        </p>
        <div className="welcome-poster-features">
          <div className="wp-feat">
            <div className="wp-feat-icon" style={{ background: 'rgba(52,211,153,0.15)', color: '#3FBE86' }}><i className="fa-solid fa-user-doctor"></i></div>
            Direct 1-on-1 Agronomist Consultations
          </div>
          <div className="wp-feat">
            <div className="wp-feat-icon" style={{ background: 'rgba(251,191,36,0.15)', color: '#C77D18' }}><i className="fa-solid fa-bell"></i></div>
            Daily Crop Protection &amp; Disease Updates
          </div>
          <div className="wp-feat">
            <div className="wp-feat-icon" style={{ background: 'rgba(96,165,250,0.15)', color: '#60a5fa' }}><i className="fa-solid fa-shield-halved"></i></div>
            100% Bio-Certified Formulations
          </div>
        </div>
        <div className="welcome-poster-btn-row">
          <button className="wp-btn-primary" onClick={() => { close(); window.open(WHATSAPP_EXPERT_URL, '_blank', 'noopener') }}>
            <i className="fa-solid fa-user-doctor"></i> Connect With Expert
          </button>
          <button className="wp-btn-secondary" onClick={close}>
            <i className="fa-solid fa-store"></i> Explore
          </button>
        </div>
      </div>
    </Modal>
  )
})
