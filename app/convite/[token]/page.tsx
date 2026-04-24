useEffect(() => {
  async function verificarConvite() {
    if (!token) { setEstado('invalido'); return }

    const { data, error } = await supabase
      .from('convites')
      .select('*')
      .eq('token', token)
      .eq('status', 'pendente')
      .gt('expira_em', new Date().toISOString())
      .single()

    if (!data) { setEstado('invalido'); return }

    // Busca o nome do profissional separado
    const { data: perfil } = await supabase
      .from('perfis')
      .select('nome, email')
      .eq('id', data.profissional_id)
      .single()

    setConvite({ ...data, perfis: perfil })
    setEstado('valido')
  }
  verificarConvite()
}, [token])