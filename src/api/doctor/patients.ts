import axios from "axios"
import { BaseAPI } from "../shared/base"
import { AuthStorage } from "../auth"
import { createFriendlyError } from "../../lib/errors"
import type { Patient } from "../shared/types"

export class DoctorPatientsAPI extends BaseAPI {
  /**
   * Get all patients for a clinic
   */
  static async getAllPatients(clinicId: number): Promise<Patient[]> {
    const data = await this.get<any>(`${this.getBaseUrl()}/dashboard/patients?clinic_id=${clinicId}`)

    if (Array.isArray(data)) {
      return data
    } else if (data.patients && Array.isArray(data.patients)) {
      return data.patients
    }

    return []
  }

  /**
   * Get a specific patient by ID (Note: This endpoint may not exist - using list filtering instead)
   */
  static async getPatientById(_patientId: number): Promise<Patient> {
    // This endpoint appears to return 404, so we'll use the list endpoint with clinic filter
    // and find the specific patient. This is not ideal but works with current API.
    throw new Error('Individual patient endpoint not available. Use getAllPatients with clinic_id instead.')
  }

  /**
   * Create a new patient
   */
  static async createPatient(patientData: Partial<Patient>): Promise<Patient> {
    return this.post<Patient>(`${this.getBaseUrl()}/dashboard/patients/create`, patientData)
  }

  /**
   * Update a patient
   */
  static async updatePatient(patientId: number, patientData: Partial<Patient>): Promise<Patient> {
    return this.put<Patient>(`${this.getBaseUrl()}/dashboard/patients/${patientId}`, patientData)
  }

  /**
   * Get patient documents
   */
  static async getPatientDocuments(patientId: number): Promise<any[]> {
    try {
      const data = await this.get<any>(`${this.getBaseUrl()}/dashboard/patients/documents/${patientId}`)

      // If response body is empty or null, just return an empty list
      if (!data) {
        return []
      }

      if (Array.isArray(data)) {
        return data
      } else if (data.documents && Array.isArray(data.documents)) {
        return data.documents
      } else if (data.data && Array.isArray(data.data)) {
        return data.data
      }

      return []
    } catch (error) {
      const status = (error as any)?.statusCode
      if (status === 404) return []
      // Return empty array if documents endpoint doesn't exist or fails
      console.warn('Failed to fetch patient documents:', error)
      // Don't throw - return empty array for graceful degradation
      return []
    }
  }

  /**
   * Get document URL for viewing
   */
  static getDocumentViewUrl(patientId: number, documentId: number): string {
    const token = AuthStorage.getToken()
    return `${this.getBaseUrl()}/dashboard/patients/documents/${patientId}/${documentId}?token=${token}`
  }

  /**
   * View a document (opens in new tab)
   */
  static async viewDocument(doc: {
    document_id?: number
    id?: number
    url?: string
    file_url?: string
    document_url?: string
  }, patientId: number): Promise<void> {
    const docUrl = doc.url || doc.file_url || doc.document_url

    if (docUrl) {
      const isExternalUrl = docUrl.startsWith('http://') || docUrl.startsWith('https://')

      if (isExternalUrl) {
        window.open(docUrl, '_blank')
        return
      } else {
        const baseUrl = this.getBaseUrl()
        const fullUrl = `${baseUrl}${docUrl.startsWith('/') ? '' : '/'}${docUrl}`
        const token = AuthStorage.getToken()
        window.open(`${fullUrl}?token=${token}`, '_blank')
        return
      }
    }

    // If no URL, try document endpoint
    const documentId = doc.document_id || doc.id
    if (documentId) {
      const viewUrl = this.getDocumentViewUrl(patientId, documentId)
      window.open(viewUrl, '_blank')
      return
    }

    throw new Error('Document URL not available')
  }

  /**
   * Download a document
   */
  static async downloadDocument(
    doc: {
      document_id?: number
      id?: number
      type?: string
      url?: string
      file_url?: string
      document_url?: string
    },
    patientId: number
  ): Promise<void> {
    const docId = doc.document_id || doc.id
    const docUrl = doc.url || doc.file_url || doc.document_url

    let fetchUrl: string
    let isExternalUrl = false

    if (docUrl) {
      isExternalUrl = docUrl.startsWith('http://') || docUrl.startsWith('https://')
      fetchUrl = isExternalUrl
        ? docUrl
        : `${this.getBaseUrl()}${docUrl.startsWith('/') ? '' : '/'}${docUrl}`
    } else if (docId) {
      fetchUrl = `${this.getBaseUrl()}/dashboard/patients/documents/${patientId}/${docId}`
    } else {
      throw new Error('Document URL not available')
    }

    let response
    try {
      response = await this.client.get(fetchUrl, {
        responseType: 'blob',
      })
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status ?? 500
        const serverMessage = typeof (error.response?.data as any)?.message === 'string'
          ? (error.response?.data as any).message
          : undefined
        throw createFriendlyError(status, serverMessage, 'data')
      }
      throw error instanceof Error ? error : new Error('Failed to fetch document')
    }

    const blob = response.data as Blob
    const contentType = response.headers['content-type'] || 'application/octet-stream'

    // Determine file extension
    const getFileExtension = (contentType: string, url: string): string => {
      if (contentType.includes('pdf')) return 'pdf'
      if (contentType.includes('image')) {
        if (contentType.includes('jpeg') || contentType.includes('jpg')) return 'jpg'
        if (contentType.includes('png')) return 'png'
        if (contentType.includes('gif')) return 'gif'
      }
      if (contentType.includes('word')) return 'docx'
      if (contentType.includes('excel') || contentType.includes('spreadsheet')) return 'xlsx'

      // Try to get extension from URL
      const urlMatch = url.match(/\.([a-zA-Z0-9]+)(\?|$)/)
      if (urlMatch) return urlMatch[1]

      return 'pdf' // Default to PDF
    }

    const extension = getFileExtension(contentType, docUrl || '')
    const fileName = `${doc.type || 'document'}_${docId || 'file'}.${extension}`

    // Create download link
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  }
}

