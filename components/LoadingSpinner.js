import { motion } from 'framer-motion'
import { Building2 } from 'lucide-react'

export default function LoadingSpinner({ message = "Chargement..." }) {
  return (
    <div className="flex flex-col items-center justify-center p-12">
      <motion.div
        className="relative"
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
      >
        <div className="w-16 h-16 border-4 border-primary-200 dark:border-primary-800 rounded-full"></div>
        <div className="absolute top-0 left-0 w-16 h-16 border-4 border-transparent border-t-primary-600 rounded-full"></div>
        <motion.div
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 1, repeat: Infinity }}
        >
          <Building2 className="h-6 w-6 text-primary-600" />
        </motion.div>
      </motion.div>
      
      <motion.p
        className="mt-4 text-neutral-600 dark:text-neutral-400 font-medium"
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      >
        {message}
      </motion.p>
    </div>
  )
}
