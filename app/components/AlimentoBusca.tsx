'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

export type AlimentoTACO = {
  id: number
  nome: string
  categoria: string
  energia_kcal: number
  proteina_g: number
  carbo_g: number
  gordura_g: number
  fibra_g: number
}

type Fonte = 'taco' | 'usda'

type Props = {
  value: string
  onChange: (nome: string) => void
  onSelect: (alimento: AlimentoTACO) => void
  placeholder?: string
  className?: string
}

const CATEGORIA_COR: Record<string, string> = {
  'Carnes e aves': 'text-red-400',
  'Peixes':        'text-blue-400',
  'Ovos':          'text-yellow-400',
  'Laticínios':    'text-sky-400',
  'Cereais':       'text-orange-400',
  'Leguminosas':   'text-lime-400',
  'Tubérculos':    'text-amber-400',
  'Frutas':        'text-pink-400',
  'Verduras':      'text-green-400',
  'Gorduras':      'text-yellow-600',
  'Oleaginosas':   'text-orange-300',
  'Outros':        'text-zinc-400',
  // USDA categories
  'Poultry Products':            'text-red-400',
  'Beef Products':               'text-red-500',
  'Pork Products':               'text-red-300',
  'Finfish and Shellfish Products': 'text-blue-400',
  'Dairy and Egg Products':      'text-sky-400',
  'Grain Products':              'text-orange-400',
  'Legumes and Legume Products': 'text-lime-400',
  'Vegetables and Vegetable Products': 'text-green-400',
  'Fruits and Fruit Juices':     'text-pink-400',
  'Fats and Oils':               'text-yellow-600',
  'Nut and Seed Products':       'text-orange-300',
  'Beverages':                   'text-cyan-400',
  'Sweets':                      'text-pink-300',
}

export default function AlimentoBusca({ value, onChange, onSelect, placeholder = 'Nome do alimento', className = '' }: Props) {
  const [fonte, setFonte] = useState<Fonte>('taco')
  const [sugestoes, setSugestoes] = useState<AlimentoTACO[]>([])
  const [aberto, setAberto] = useState(false)
  const [buscando, setBuscando] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setAberto(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Re-search when fonte changes if there's already a term
  useEffect(() => {
    if (value.trim().length >= 2) buscar(value, fonte)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fonte])

  async function buscar(texto: string, src: Fonte) {
    setBuscando(true)
    try {
      if (src === 'taco') {
        const { data } = await supabase
          .from('alimentos_taco')
          .select('*')
          .ilike('nome', `%${texto.trim()}%`)
          .order('nome')
          .limit(8)
        setSugestoes(data ?? [])
        setAberto((data?.length ?? 0) > 0)
      } else {
        const res = await fetch(`/api/busca-alimento?q=${encodeURIComponent(texto.trim())}`)
        const data: AlimentoTACO[] = await res.json()
        setSugestoes(data)
        setAberto(data.length > 0)
      }
    } finally {
      setBuscando(false)
    }
  }

  function handleChange(texto: string) {
    onChange(texto)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (texto.trim().length < 2) { setSugestoes([]); setAberto(false); return }
    debounceRef.current = setTimeout(() => buscar(texto, fonte), 280)
  }

  function handleSelect(al: AlimentoTACO) {
    onSelect(al)
    onChange(al.nome)
    setSugestoes([])
    setAberto(false)
  }

  function trocarFonte(nova: Fonte) {
    setFonte(nova)
    setSugestoes([])
    setAberto(false)
  }

  const isTaco = fonte === 'taco'

  return (
    <div ref={ref} className="relative w-full">
      {/* seletor de fonte */}
      <div className="flex items-center gap-1 mb-1.5">
        <button
          type="button"
          onClick={() => trocarFonte('taco')}
          className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider border transition-all ${isTaco ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' : 'border-white/[0.08] text-zinc-600 hover:text-zinc-400 hover:border-white/[0.14]'}`}>
          🇧🇷 TACO
        </button>
        <button
          type="button"
          onClick={() => trocarFonte('usda')}
          className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider border transition-all ${!isTaco ? 'bg-blue-500/15 border-blue-500/30 text-blue-400' : 'border-white/[0.08] text-zinc-600 hover:text-zinc-400 hover:border-white/[0.14]'}`}>
          🌎 USDA
        </button>
        {buscando && <div className="w-3 h-3 border border-zinc-600 border-t-transparent rounded-full animate-spin ml-1" />}
      </div>

      <input
        value={value}
        onChange={e => handleChange(e.target.value)}
        onFocus={() => sugestoes.length > 0 && setAberto(true)}
        placeholder={placeholder}
        className={className}
      />

      {aberto && sugestoes.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1 z-50 rounded-xl border border-white/[0.1] overflow-hidden shadow-2xl"
          style={{ background: '#171717' }}>
          {sugestoes.map(al => (
            <button key={al.id} onMouseDown={e => { e.preventDefault(); handleSelect(al) }}
              className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/[0.09] transition-colors text-left border-b border-white/[0.14] last:border-0">
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">{al.nome}</p>
                <p className={`text-[10px] ${CATEGORIA_COR[al.categoria] ?? 'text-zinc-500'}`}>{al.categoria}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-orange-400 text-[10px] font-bold">{al.energia_kcal} kcal</p>
                <p className="text-blue-400 text-[10px]">{al.proteina_g}g prot · {al.carbo_g}g carb</p>
              </div>
            </button>
          ))}
          <div className="px-3 py-2 border-t border-white/[0.14] flex items-center justify-between">
            {isTaco
              ? <p className="text-zinc-700 text-[9px] uppercase tracking-wider">TACO · UNICAMP · valores por 100g</p>
              : <p className="text-zinc-700 text-[9px] uppercase tracking-wider">USDA FoodData Central · valores por 100g</p>
            }
          </div>
        </div>
      )}
    </div>
  )
}
