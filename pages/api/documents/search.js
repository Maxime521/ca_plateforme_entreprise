// pages/api/documents/search.js - Documents search API with Supabase
import { createAdminClient } from '../../../lib/supabase';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { 
    q = '', 
    typeDocument = '', 
    source = '', 
    dateFrom = '', 
    dateTo = '',
    page = 1,
    limit = 20
  } = req.query;

  // If no search criteria provided, return empty results
  if (!q && !typeDocument && !source && !dateFrom && !dateTo) {
    return res.status(200).json({
      results: [],
      total: 0,
      page: parseInt(page),
      totalPages: 0
    });
  }

  try {
    const supabase = createAdminClient();
    
    // Build the query
    let query = supabase
      .from('documents')
      .select(`*,companies!inner(id,siren,denomination,forme_juridique,adresse_siege,code_ape,libelle_ape,active)`, { count: 'exact' });

    // Apply search filters
    if (q && q.length >= 2) {
      // Search across multiple fields using a more reliable approach
      const searchTerm = `%${q}%`;
      
      // Build OR conditions for direct document fields and company fields separately
      const documentConditions = [
        `description.ilike.${searchTerm}`,
        `contenu.ilike.${searchTerm}`,
        `reference.ilike.${searchTerm}`
      ];
      
      // For company searches, we'll filter by SIREN directly since it's a more reliable approach
      if (/^\d+$/.test(q)) {
        // If query is numeric, search SIREN in the companies table
        query = query.filter('companies.siren', 'ilike', searchTerm);
      } else {
        // For text searches, search in document fields and company denomination
        query = query.or(documentConditions.join(','));
        // Add company name search if not purely numeric
        query = query.filter('companies.denomination', 'ilike', searchTerm);
      }
    }

    // Apply document type filter
    if (typeDocument) {
      query = query.eq('type_document', typeDocument);
    }

    // Apply source filter
    if (source) {
      query = query.eq('source', source);
    }

    // Apply date range filters
    if (dateFrom) {
      query = query.gte('date_publication', dateFrom);
    }
    if (dateTo) {
      query = query.lte('date_publication', dateTo);
    }

    // Apply pagination and ordering
    const offset = (parseInt(page) - 1) * parseInt(limit);
    query = query
      .order('date_publication', { ascending: false })
      .range(offset, offset + parseInt(limit) - 1);

    const { data: documents, error, count } = await query;

    if (error) {
      console.error('Documents search error:', error);
      throw error;
    }

    // Format the results
    const formattedResults = (documents || []).map(formatDocumentForResponse);

    return res.status(200).json({
      results: formattedResults,
      total: count || 0,
      page: parseInt(page),
      totalPages: Math.ceil((count || 0) / parseInt(limit))
    });
    
  } catch (error) {
    console.error('Documents search error:', error);
    return res.status(500).json({ 
      message: 'Erreur lors de la recherche de documents',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

function formatDocumentForResponse(doc) {
  return {
    id: doc.id,
    companyName: doc.companies?.denomination || 'N/A',
    siren: doc.companies?.siren || 'N/A',
    siret: doc.companies?.siren ? `${doc.companies.siren}00000` : 'N/A', // Basic SIRET format
    datePublication: doc.date_publication,
    typeDocument: doc.type_document,
    source: doc.source,
    description: doc.description || '',
    lienDocument: doc.lien_document,
    status: 'Traité', // Default status
    company: {
      id: doc.companies?.id,
      siren: doc.companies?.siren,
      denomination: doc.companies?.denomination,
      formeJuridique: doc.companies?.forme_juridique,
      adresseSiege: doc.companies?.adresse_siege,
      codeAPE: doc.companies?.code_ape,
      libelleAPE: doc.companies?.libelle_ape,
      active: doc.companies?.active
    },
    // Additional document fields
    typeAvis: doc.type_avis,
    reference: doc.reference,
    contenu: doc.contenu
  };
}