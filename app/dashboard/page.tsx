<nav
  className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/[0.04]"
  style={{
    paddingBottom: 'env(safe-area-inset-bottom)',
    background: 'rgba(8,8,8,0.95)',
    backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',
  }}
>
  <div className="max-w-md mx-auto flex items-center justify-around px-2 pt-3 pb-2">
    {getNavItems(perfil?.tipo).map((item) => (
      <button
        key={item.id}
        onClick={() => {
          if (item.id === 'perfil') {
            router.push('/perfil')
          } 
          else if (item.id === 'alunos') {
            router.push('/personal/alunos') // melhor estruturado
          } 
          else if (item.id === 'pacientes') {
            router.push('/nutri/pacientes') // melhor estruturado
          } 
          else if (item.id === 'agenda') {
            router.push('/agenda')
          } 
          else {
            setActiveTab(item.id)
          }
        }}
        className="flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition-all duration-150 active:scale-90"
      >
        <span
          className={`text-lg transition-all duration-200 ${
            activeTab === item.id ? 'opacity-100' : 'opacity-20'
          }`}
        >
          {item.icon}
        </span>

        <span
          className={`text-[9px] tracking-[0.12em] uppercase font-semibold transition-all ${
            activeTab === item.id ? 'text-white' : 'text-zinc-700'
          }`}
        >
          {item.label}
        </span>

        {activeTab === item.id && (
          <div className="w-1 h-1 rounded-full bg-emerald-400" />
        )}
      </button>
    ))}
  </div>
</nav>