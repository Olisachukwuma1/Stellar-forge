import { NavLink } from 'react-router-dom'

export const NavBar: React.FC = () => {
  const getLinkClass = ({ isActive }: { isActive: boolean }) =>
    `px-3 py-2 rounded-md text-sm font-medium ${
      isActive ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-200'
    }`

  return (
    <nav aria-label="Primary" className="mt-4 mb-4">
      <div className="flex flex-wrap gap-2">
        <NavLink to="/" className={getLinkClass} end>
          Home
        </NavLink>
        <NavLink to="/create" className={getLinkClass}>
          Create
        </NavLink>
        <NavLink to="/mint" className={getLinkClass}>
          Mint
        </NavLink>
        <NavLink to="/burn" className={getLinkClass}>
          Burn
        </NavLink>
        <NavLink to="/tokens" className={getLinkClass}>
          Tokens
        </NavLink>
        <NavLink to="/explorer" className={getLinkClass}>
          Explorer
        </NavLink>
      </div>
    </nav>
  )
}
