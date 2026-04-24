type TipoUsuario = 'cliente' | 'personal' | 'nutricionista'

type NavItem = {
  id: string
  icon: string
  label: string
}

export function getNavItems(tipo?: TipoUsuario): NavItem[] {
  if (tipo === 'personal') {
    return [
      { id: 'home', icon: '⬜', label: 'Início' },
      { id: 'agenda', icon: '◫', label: 'Agenda' },
      { id: 'alunos', icon: '◈', label: 'Alunos' },
      { id: 'perfil', icon: '◉', label: 'Perfil' },
    ]
  }

  if (tipo === 'nutricionista') {
    return [
      { id: 'home', icon: '⬜', label: 'Início' },
      { id: 'agenda', icon: '◫', label: 'Agenda' },
      { id: 'pacientes', icon: '◈', label: 'Pacientes' },
      { id: 'perfil', icon: '◉', label: 'Perfil' },
    ]
  }

  // cliente (default)
  return [
    { id: 'home', icon: '⬜', label: 'Início' },
    { id: 'treino', icon: '◈', label: 'Treino' },
    { id: 'nutri', icon: '◇', label: 'Nutrição' },
    { id: 'evolucao', icon: '△', label: 'Evolução' },
    { id: 'perfil', icon: '◉', label: 'Perfil' },
  ]
}