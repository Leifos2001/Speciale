"use client"

import dynamic from 'next/dynamic'

const NoterApp = dynamic(() => import('../noter-app'), {
  ssr: false
})

export default function Page() {
  return <NoterApp />
}