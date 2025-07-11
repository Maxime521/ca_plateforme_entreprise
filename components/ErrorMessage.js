import { motion } from 'framer-motion'
import { AlertCircle, RefreshCw } from 'lucide-react'

export default function ErrorMessage({ 
  title = "Une erreur s'est produite", 
  message, 
  onRetry 
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-accent-50 dark:bg-accent-900/20 border border-accent-200 dark:border-accent-800 rounded-xl p-6 text-center"
    >
      <div className="flex items-center justify-center w-12 h-12 bg-accent-100 dark:bg-accent-900/30 rounded-full mx-auto mb-4">
        <AlertCircle className="h-6 w-6 text-accent-600 dark:text-accent-400" />
      </div>
      
      <h3 className="text-lg font-semibold text-accent-800 dark:text-accent-200 mb-2">
        {title}
      </h3>
      
      {message && (
        <p className="text-accent-700 dark:text-accent-300 mb-4">
          {message}
        </p>
      )}
      
      {onRetry && (
        <motion.button
          onClick={onRetry}
          className="inline-flex items-center px-4 py-2 bg-accent-600 text-white rounded-lg font-medium hover:bg-accent-700 transition-colors duration-200"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Réessayer
        </motion.button>
      )}
    </motion.div>
  )
}
