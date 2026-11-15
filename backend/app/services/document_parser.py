import os
from typing import Tuple
from fastapi import HTTPException, status
import pdfplumber
from docx import Document
from app.core.config import settings

def validate_and_parse_document(file_path: str, filename: str) -> Tuple[str, int, str]:
    """
    Validates document constraints:
    - Max size: 25 MB
    - Formats: PDF or DOCX
    - Max pages: 20 pages
    Returns: (extracted_text, page_count, file_type)
    """
    file_size = os.path.getsize(file_path)
    if file_size > settings.MAX_FILE_SIZE_MB * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File exceeds maximum allowed size of {settings.MAX_FILE_SIZE_MB}MB."
        )

    ext = os.path.splitext(filename)[1].lower()
    if ext not in [".pdf", ".docx"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported format. Only .pdf and .docx documents are supported."
        )

    if ext == ".pdf":
        return _parse_pdf(file_path)
    else:
        return _parse_docx(file_path)

def _parse_pdf(file_path: str) -> Tuple[str, int, str]:
    extracted_text_chunks = []
    try:
        with pdfplumber.open(file_path) as pdf:
            page_count = len(pdf.pages)
            if page_count > settings.MAX_PAGE_COUNT:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Document exceeds maximum length of {settings.MAX_PAGE_COUNT} pages (found {page_count} pages)."
                )
            
            for page_num, page in enumerate(pdf.pages, start=1):
                page_text = page.extract_text() or ""
                if page_text.strip():
                    extracted_text_chunks.append(page_text)
                    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Corrupted or password-protected PDF detected: {str(e)}"
        )

    full_text = "\n\n".join(extracted_text_chunks).strip()
    if not full_text:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No selectable text found in the PDF. Scanned image-only PDFs are outside Version 1.0 scope."
        )

    return full_text, page_count, "PDF"

def _parse_docx(file_path: str) -> Tuple[str, int, str]:
    try:
        doc = Document(file_path)
        paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
        for table in doc.tables:
            for row in table.rows:
                row_text = " | ".join(cell.text.strip() for cell in row.cells if cell.text.strip())
                if row_text:
                    paragraphs.append(row_text)
                    
        full_text = "\n\n".join(paragraphs).strip()
        if not full_text:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No text found in the DOCX file."
            )
        
        # Approximate page count for docx (approx 350 words per page)
        words = len(full_text.split())
        approx_pages = max(1, (words + 349) // 350)
        if approx_pages > settings.MAX_PAGE_COUNT:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"DOCX exceeds maximum length limit of {settings.MAX_PAGE_COUNT} pages."
            )

        return full_text, approx_pages, "DOCX"
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Corrupted or invalid DOCX document: {str(e)}"
        )
