"use client"

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, FileText, Download, Upload } from 'lucide-react'

interface DocumentInfo {
  type: string
  filename: string
  student_email: string
  student_name: string
  project_name: string
  role: string
}

export default function SignDocumentPage() {
  const searchParams = useSearchParams()
  const [documentInfo, setDocumentInfo] = useState<DocumentInfo | null>(null)
  const [signature, setSignature] = useState('')
  const [date, setDate] = useState('')
  const [loading, setLoading] = useState(false)
  const [signed, setSigned] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    // Extract document info from URL params
    const type = searchParams.get('type') || 'intern'
    const filename = searchParams.get('file') || ''
    const student = searchParams.get('student') || ''
    
    setDocumentInfo({
      type,
      filename,
      student_email: student,
      student_name: student.split('@')[0].replace('.', ' ').replace(/\b\w/g, l => l.toUpperCase()),
      project_name: 'NGI Capital Advisory Project',
      role: 'Student Analyst'
    })
    
    setDate(new Date().toLocaleDateString())
  }, [searchParams])

  const handleSign = async () => {
    if (!signature.trim()) {
      setError('Please enter your signature')
      return
    }

    setLoading(true)
    setError('')

    try {
      // In a real implementation, this would:
      // 1. Add the signature to the PDF
      // 2. Save the signed document
      // 3. Update the database
      // 4. Send confirmation email
      
      // For now, we'll just simulate the process
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      setSigned(true)
      console.log('Document signed successfully:', {
        type: documentInfo?.type,
        student: documentInfo?.student_email,
        signature,
        date
      })
      
    } catch (err) {
      setError('Failed to sign document. Please try again.')
      console.error('Signing error:', err)
    } finally {
      setLoading(false)
    }
  }

  const downloadDocument = () => {
    // In a real implementation, this would download the PDF
    console.log('Downloading document:', documentInfo?.filename)
    // For demo purposes, we'll just show an alert
    alert('Document download would start here. In production, this would download the actual PDF.')
  }

  if (!documentInfo) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p>Loading document...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (signed) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <CardTitle className="text-green-600">Document Signed Successfully!</CardTitle>
            <CardDescription>
              Your {documentInfo.type === 'intern' ? 'Intern Agreement' : 'NDA'} has been signed and submitted.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                You will receive a confirmation email shortly with next steps.
              </p>
              <p className="text-sm text-muted-foreground">
                Thank you for joining NGI Capital Advisory!
              </p>
            </div>
            <Button 
              onClick={() => window.close()} 
              className="w-full"
            >
              Close
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container mx-auto px-4 max-w-2xl">
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <FileText className="w-6 h-6" />
              <div>
                <CardTitle>
                  Sign {documentInfo.type === 'intern' ? 'Intern Agreement' : 'Non-Disclosure Agreement'}
                </CardTitle>
                <CardDescription>
                  Please review and sign the document below
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Document Info */}
            <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
              <div>
                <Label className="text-sm font-medium">Student</Label>
                <p className="text-sm">{documentInfo.student_name}</p>
                <p className="text-xs text-muted-foreground">{documentInfo.student_email}</p>
              </div>
              <div>
                <Label className="text-sm font-medium">Project</Label>
                <p className="text-sm">{documentInfo.project_name}</p>
                <Badge variant="outline">{documentInfo.role}</Badge>
              </div>
            </div>

            {/* Document Preview */}
            <div className="border rounded-lg p-4 bg-muted/50">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium">Document Preview</h3>
                <Button variant="outline" size="sm" onClick={downloadDocument}>
                  <Download className="w-4 h-4 mr-2" />
                  Download PDF
                </Button>
              </div>
              <div className="text-sm text-muted-foreground">
                <p>This is a preview of your {documentInfo.type === 'intern' ? 'Intern Agreement' : 'NDA'} document.</p>
                <p className="mt-2">
                  In production, this would show the actual PDF document with all terms and conditions.
                </p>
              </div>
            </div>

            {/* Signature Section */}
            <div className="space-y-4">
              <h3 className="font-medium">Digital Signature</h3>
              
              <div className="space-y-2">
                <Label htmlFor="signature">Your Signature</Label>
                <Input
                  id="signature"
                  placeholder="Type your full name here"
                  value={signature}
                  onChange={(e) => setSignature(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  By typing your name above, you agree to the terms of this document.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>

              {error && (
                <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">
                  {error}
                </div>
              )}

              <div className="flex space-x-4">
                <Button 
                  onClick={handleSign} 
                  disabled={loading || !signature.trim()}
                  className="flex-1"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Signing...
                    </>
                  ) : (
                    <>
                      <FileText className="w-4 h-4 mr-2" />
                      Sign Document
                    </>
                  )}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => window.close()}
                  disabled={loading}
                >
                  Cancel
                </Button>
              </div>
            </div>

            {/* Terms */}
            <div className="text-xs text-muted-foreground border-t pt-4">
              <p>
                By signing this document, you agree to the terms and conditions outlined in the 
                {documentInfo.type === 'intern' ? ' Intern Agreement' : ' Non-Disclosure Agreement'}.
                This signature has the same legal effect as a handwritten signature.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
