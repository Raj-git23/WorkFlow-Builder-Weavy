import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import React from 'react'

const CreateFileButton = () => {
  return (
    <div>
        <Button variant="yellowButton">
            <Plus />Create New File
        </Button>
    </div>
  )
}

export default CreateFileButton