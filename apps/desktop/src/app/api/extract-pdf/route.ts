import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }
    
    const fileName = file.name.toLowerCase();
    console.log('Processing PDF:', fileName);
    
    // Simulated extraction based on file name
    // In production, you would use a server-side PDF library here
    let extractedText = '';
    
    // Certificate of Formation
    if (fileName.includes('formation') || fileName.includes('certificate')) {
      extractedText = `
        STATE OF DELAWARE
        CERTIFICATE OF FORMATION
        OF LIMITED LIABILITY COMPANY
        
        FIRST: The name of the limited liability company is NGI Capital LLC.
        
        SECOND: The address of its registered office in the State of Delaware is
        251 Little Falls Drive, in the City of Wilmington, County of New Castle,
        Delaware 19808. The name of its registered agent at such address is
        Corporate Service Company.
        
        Filed: July 16, 2024
        Effective Date: July 16, 2024
        File Number: 7816542
      `;
    }
    
    // EIN Letter
    else if (fileName.includes('ein')) {
      extractedText = `
        Department of the Treasury
        Internal Revenue Service
        
        EIN: 88-3957014
        Entity Name: NGI Capital LLC
        
        Date: July 20, 2024
        
        We assigned you Employer Identification Number 88-3957014.
      `;
    }
    
    // Operating Agreement
    else if (fileName.includes('operating')) {
      extractedText = `
        OPERATING AGREEMENT OF NGI CAPITAL LLC
        
        Member: Andre Nurmamade
        Ownership Interest: 50%
        
        Member: Landon Whitworth
        Ownership Interest: 50%
      `;
    }
    
    return NextResponse.json({
      text: extractedText,
      fileName: file.name,
      size: file.size
    });
    
  } catch (error) {
    console.error('PDF extraction error:', error);
    return NextResponse.json(
      { error: 'Failed to extract PDF content' },
      { status: 500 }
    );
  }
}