"""
AI-Powered SEO Service using Emergent LLM
Generates optimized SEO content for classifieds marketplace listings
"""

import os
import json
import logging
from typing import Dict, Any, Optional
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)


class AISEOService:
    """Service for AI-powered SEO content generation"""
    
    def __init__(self):
        self.api_key = os.environ.get("EMERGENT_LLM_KEY")
        if not self.api_key:
            logger.warning("EMERGENT_LLM_KEY not found in environment")
    
    def _get_system_prompt(self) -> str:
        """Return the system prompt for SEO optimization"""
        return """You are an expert SEO copywriter specializing in classifieds marketplace listings.

Your task is to generate optimized SEO content that:
1. Is compelling and encourages clicks
2. Contains relevant keywords naturally
3. Follows SEO best practices (proper length, action-oriented language)
4. Is appropriate for a local buy/sell marketplace
5. Creates urgency without being pushy

Guidelines for classifieds:
- Meta titles: 50-60 characters, include price if space allows
- Meta descriptions: 120-160 characters, highlight key selling points
- Use action words: "Buy", "Shop", "Find", "Get", "Save"
- Include location when relevant
- Mention condition (new, used, like new) when applicable
- Always be truthful - don't exaggerate

Output format: Always respond with valid JSON only, no additional text."""

    async def generate_seo_suggestions(
        self,
        title: str,
        description: str,
        price: float,
        currency: str = "EUR",
        category: str = None,
        subcategory: str = None,
        condition: str = None,
        location: str = None,
        attributes: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """
        Generate AI-powered SEO suggestions for a listing
        
        Returns:
            Dict containing:
            - meta_title: Optimized meta title (50-60 chars)
            - meta_description: Optimized meta description (120-160 chars)
            - og_title: Social media title
            - og_description: Social media description
            - keywords: List of relevant keywords
            - improvements: List of SEO improvement suggestions
        """
        if not self.api_key:
            raise ValueError("EMERGENT_LLM_KEY not configured")
        
        # Import here to avoid issues if library not installed
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        
        # Format currency symbol
        currency_symbols = {
            "EUR": "€", "USD": "$", "GBP": "£", 
            "KES": "KSh", "NGN": "₦", "TZS": "TSh"
        }
        symbol = currency_symbols.get(currency, currency + " ")
        formatted_price = f"{symbol}{price:,.0f}"
        
        # Build context for the AI
        listing_context = f"""
Listing Details:
- Title: {title}
- Description: {description[:500] if description else 'No description'}
- Price: {formatted_price}
- Category: {category or 'General'}
- Subcategory: {subcategory or 'N/A'}
- Condition: {condition or 'Not specified'}
- Location: {location or 'Not specified'}
"""
        
        if attributes:
            attr_str = ", ".join([f"{k}: {v}" for k, v in attributes.items() if v])
            if attr_str:
                listing_context += f"- Attributes: {attr_str}\n"
        
        user_prompt = f"""{listing_context}

Generate optimized SEO content for this listing. Return a JSON object with:
{{
    "meta_title": "optimized title (50-60 chars, include price)",
    "meta_description": "compelling description (120-160 chars, call to action)",
    "og_title": "social media title (catchy, shareable)",
    "og_description": "social description (encourage sharing)",
    "keywords": ["keyword1", "keyword2", ...up to 10 relevant keywords],
    "improvements": ["suggestion 1", "suggestion 2"...specific tips to improve the listing]
}}

Focus on what makes this item appealing to buyers in a local marketplace."""

        try:
            chat = LlmChat(
                api_key=self.api_key,
                session_id=f"seo_gen_{hash(title)}",
                system_message=self._get_system_prompt()
            )
            chat.with_model("openai", "gpt-5.2")
            
            user_message = UserMessage(text=user_prompt)
            response = await chat.send_message(user_message)
            
            # Parse JSON response
            result = self._parse_ai_response(response)
            return result
            
        except Exception as e:
            logger.error(f"AI SEO generation failed: {str(e)}")
            raise
    
    async def optimize_existing_seo(
        self,
        current_meta_title: str,
        current_meta_description: str,
        listing_title: str,
        listing_description: str,
        price: float,
        currency: str = "EUR"
    ) -> Dict[str, Any]:
        """
        Optimize existing SEO content with AI suggestions
        
        Returns improved versions and analysis of current SEO
        """
        if not self.api_key:
            raise ValueError("EMERGENT_LLM_KEY not configured")
        
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        
        currency_symbols = {
            "EUR": "€", "USD": "$", "GBP": "£",
            "KES": "KSh", "NGN": "₦", "TZS": "TSh"
        }
        symbol = currency_symbols.get(currency, currency + " ")
        formatted_price = f"{symbol}{price:,.0f}"
        
        user_prompt = f"""Analyze and improve this listing's SEO:

Current SEO:
- Meta Title: {current_meta_title}
- Meta Description: {current_meta_description}

Original Listing:
- Title: {listing_title}
- Description: {listing_description[:300]}
- Price: {formatted_price}

Return a JSON object with:
{{
    "analysis": {{
        "title_score": 1-10,
        "title_issues": ["issue1", "issue2"],
        "description_score": 1-10,
        "description_issues": ["issue1", "issue2"]
    }},
    "optimized_meta_title": "improved title",
    "optimized_meta_description": "improved description",
    "reasoning": "brief explanation of changes"
}}"""

        try:
            chat = LlmChat(
                api_key=self.api_key,
                session_id=f"seo_optimize_{hash(current_meta_title)}",
                system_message=self._get_system_prompt()
            )
            chat.with_model("openai", "gpt-5.2")
            
            user_message = UserMessage(text=user_prompt)
            response = await chat.send_message(user_message)
            
            return self._parse_ai_response(response)
            
        except Exception as e:
            logger.error(f"AI SEO optimization failed: {str(e)}")
            raise
    
    async def generate_bulk_seo(
        self,
        listings: list
    ) -> list:
        """
        Generate SEO for multiple listings in batch
        
        Args:
            listings: List of dicts with listing data
            
        Returns:
            List of SEO suggestions for each listing
        """
        results = []
        for listing in listings:
            try:
                seo = await self.generate_seo_suggestions(
                    title=listing.get("title", ""),
                    description=listing.get("description", ""),
                    price=listing.get("price", 0),
                    currency=listing.get("currency", "EUR"),
                    category=listing.get("category_name"),
                    subcategory=listing.get("subcategory"),
                    condition=listing.get("condition"),
                    location=listing.get("location"),
                    attributes=listing.get("attributes")
                )
                results.append({
                    "listing_id": listing.get("id"),
                    "success": True,
                    "seo_data": seo
                })
            except Exception as e:
                results.append({
                    "listing_id": listing.get("id"),
                    "success": False,
                    "error": str(e)
                })
        return results
    
    async def generate_category_seo(
        self,
        category_name: str,
        category_id: str,
        listing_count: int = 0
    ) -> Dict[str, Any]:
        """
        Generate SEO content for a category page
        """
        if not self.api_key:
            raise ValueError("EMERGENT_LLM_KEY not configured")
        
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        
        user_prompt = f"""Generate SEO for a marketplace category page:

Category: {category_name}
Category URL: /category/{category_id}
Active Listings: {listing_count}

Return JSON:
{{
    "meta_title": "category page title (50-60 chars)",
    "meta_description": "category description (120-160 chars, encourage browsing)",
    "keywords": ["keyword1", "keyword2"...relevant keywords],
    "h1_suggestion": "main heading for the page"
}}

Focus on local buying/selling and browsing listings."""

        try:
            chat = LlmChat(
                api_key=self.api_key,
                session_id=f"cat_seo_{category_id}",
                system_message=self._get_system_prompt()
            )
            chat.with_model("openai", "gpt-5.2")
            
            user_message = UserMessage(text=user_prompt)
            response = await chat.send_message(user_message)
            
            return self._parse_ai_response(response)
            
        except Exception as e:
            logger.error(f"Category SEO generation failed: {str(e)}")
            raise
    
    def _parse_ai_response(self, response: str) -> Dict[str, Any]:
        """Parse AI response and extract JSON"""
        # Try to find JSON in the response
        response = response.strip()
        
        # Remove markdown code blocks if present
        if response.startswith("```"):
            lines = response.split("\n")
            # Remove first and last lines (code block markers)
            if lines[0].startswith("```"):
                lines = lines[1:]
            if lines and lines[-1].strip() == "```":
                lines = lines[:-1]
            response = "\n".join(lines)
        
        # Try direct JSON parse
        try:
            return json.loads(response)
        except json.JSONDecodeError:
            # Try to find JSON object in the response
            import re
            json_match = re.search(r'\{[\s\S]*\}', response)
            if json_match:
                try:
                    return json.loads(json_match.group())
                except json.JSONDecodeError:
                    pass
        
        # Return a structured error response
        logger.warning(f"Could not parse AI response as JSON: {response[:200]}")
        return {
            "error": "Failed to parse AI response",
            "raw_response": response[:500]
        }


# Singleton instance
ai_seo_service = AISEOService()
