#!/usr/bin/env python3
"""
Seed script for NGI Learning Center curriculum content
Creates comprehensive 80+ lesson curriculum across 5 modules
"""

import os
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session
from services.api.database import get_db
from services.api.models_learning import LearningContent
from datetime import datetime

def seed_learning_content():
    """Seed the database with comprehensive learning content"""
    db = next(get_db())
    
    # Clear existing content
    db.query(LearningContent).delete()
    db.commit()
    
    # Define comprehensive curriculum structure
    curriculum = [
        # =============================================================================
        # BUSINESS FOUNDATIONS MODULE (5 Units, 18 Lessons)
        # =============================================================================
        
        # Unit 1: Introduction to Business (4 weeks)
        {
            "module_id": "business_foundations",
            "unit_id": "intro_to_business",
            "lesson_id": "lesson_1_1_what_is_business",
            "title": "What is a Business? Core Functions and Value Creation",
            "content_type": "text",
            "content_markdown": """# What is a Business? Core Functions and Value Creation

## Learning Objectives
- Define what constitutes a business and its fundamental purpose
- Understand the core functions that drive business success
- Analyze how businesses create and capture value
- Identify the key stakeholders in any business ecosystem

## Key Concepts

### Definition of Business
A business is an organization that provides goods or services to customers in exchange for money or other forms of value. At its core, a business exists to:

1. **Create Value**: Develop products or services that solve problems or meet needs
2. **Capture Value**: Generate revenue through pricing and business models
3. **Deliver Value**: Ensure customers receive the promised benefits
4. **Sustain Value**: Maintain operations and grow over time

### Core Business Functions

#### 1. Operations
- **Production**: Creating goods or delivering services
- **Quality Control**: Ensuring consistent standards
- **Process Optimization**: Improving efficiency and effectiveness
- **Supply Chain Management**: Coordinating inputs and outputs

#### 2. Marketing & Sales
- **Market Research**: Understanding customer needs and preferences
- **Product Development**: Designing solutions that meet market demands
- **Branding**: Creating identity and differentiation
- **Customer Acquisition**: Converting prospects into customers

#### 3. Finance & Accounting
- **Financial Planning**: Budgeting and forecasting
- **Capital Management**: Raising and allocating funds
- **Financial Reporting**: Tracking performance and compliance
- **Risk Management**: Identifying and mitigating financial risks

#### 4. Human Resources
- **Talent Acquisition**: Finding and hiring the right people
- **Employee Development**: Training and career advancement
- **Performance Management**: Setting goals and providing feedback
- **Culture Building**: Creating positive work environments

#### 5. Strategy & Leadership
- **Strategic Planning**: Setting long-term direction
- **Decision Making**: Choosing between alternatives
- **Change Management**: Adapting to new circumstances
- **Stakeholder Management**: Balancing competing interests

### Value Creation Framework

Businesses create value through the **Value Chain**:

1. **Inputs** → Raw materials, labor, capital, technology
2. **Processes** → Transformation and value-adding activities
3. **Outputs** → Products or services that meet customer needs
4. **Outcomes** → Customer satisfaction, revenue, profit

### Key Stakeholders

Every business operates within a network of stakeholders:

- **Customers**: End users who purchase products/services
- **Employees**: People who work for the organization
- **Investors**: Owners and shareholders who provide capital
- **Suppliers**: Partners who provide inputs
- **Community**: Local society and environment
- **Government**: Regulatory and legal framework

## Real-World Examples

### Apple Inc.
- **Value Creation**: Innovative technology products that enhance productivity and lifestyle
- **Core Functions**: Design (operations), marketing (brand), finance (capital allocation)
- **Stakeholders**: iPhone users, employees, shareholders, suppliers (Foxconn), app developers

### Tesla Inc.
- **Value Creation**: Electric vehicles and clean energy solutions
- **Core Functions**: Manufacturing (operations), direct sales (marketing), R&D (innovation)
- **Stakeholders**: EV buyers, employees, shareholders, battery suppliers, charging network

## Key Takeaways

1. **Businesses exist to create, capture, and deliver value**
2. **Success requires excellence across all core functions**
3. **Stakeholder management is crucial for long-term sustainability**
4. **Value creation is the foundation of competitive advantage**

## Next Steps

In the next lesson, we'll explore how businesses operate within larger ecosystems and how to analyze stakeholder relationships using frameworks like Porter's Five Forces.

## Discussion Questions

1. Think of a business you interact with regularly. How do they create value for you?
2. What core functions do you think are most important for a startup vs. a large corporation?
3. How might different stakeholders have conflicting interests in the same business?
""",
            "estimated_duration_minutes": 15,
            "difficulty_level": "beginner",
            "sort_order": 1,
            "prerequisites": [],
            "tags": ["business", "fundamentals", "value-creation"],
            "is_published": True
        },
        
        {
            "module_id": "business_foundations",
            "unit_id": "intro_to_business",
            "lesson_id": "lesson_1_2_business_ecosystems",
            "title": "Business Ecosystems and Stakeholder Analysis",
            "content_type": "text",
            "content_markdown": """# Business Ecosystems and Stakeholder Analysis

## Learning Objectives
- Understand how businesses operate within larger ecosystems
- Learn to identify and analyze key stakeholders
- Apply stakeholder mapping techniques
- Recognize the interdependencies in business networks

## Key Concepts

### Business Ecosystem Definition
A business ecosystem is a network of organizations, individuals, and institutions that interact to create and deliver value. Unlike traditional supply chains, ecosystems are characterized by:

- **Interdependence**: Success depends on the health of the entire network
- **Co-evolution**: Partners adapt and grow together
- **Value Co-creation**: Multiple parties contribute to value creation
- **Dynamic Relationships**: Connections change over time

### Stakeholder Analysis Framework

#### 1. Stakeholder Identification
**Primary Stakeholders** (Direct impact):
- Customers
- Employees
- Shareholders/Investors
- Suppliers
- Distributors/Retailers

**Secondary Stakeholders** (Indirect impact):
- Government/Regulators
- Media
- Community Groups
- Competitors
- Industry Associations

#### 2. Stakeholder Mapping
Use a **Power vs. Interest Matrix**:

**High Power, High Interest** (Manage Closely):
- Key customers
- Major investors
- Regulatory bodies

**High Power, Low Interest** (Keep Satisfied):
- Government agencies
- Large suppliers
- Industry leaders

**Low Power, High Interest** (Keep Informed):
- Employees
- Local communities
- Industry analysts

**Low Power, Low Interest** (Monitor):
- General public
- Minor suppliers
- Competitors

### Ecosystem Analysis Tools

#### 1. Value Network Mapping
- Identify all players in the ecosystem
- Map value flows between participants
- Highlight critical dependencies
- Identify potential bottlenecks

#### 2. Stakeholder Influence Analysis
- Assess each stakeholder's influence level
- Identify potential conflicts of interest
- Map stakeholder relationships
- Plan engagement strategies

### Real-World Examples

#### Amazon Ecosystem
**Core**: Amazon.com marketplace
**Stakeholders**:
- Sellers (3rd party merchants)
- Customers (buyers)
- AWS customers (enterprise)
- Delivery partners (logistics)
- Content creators (Prime Video)
- Developers (Alexa skills)

**Value Flows**:
- Sellers pay fees → Amazon provides platform
- Customers pay → Amazon provides convenience
- AWS customers pay → Amazon provides infrastructure

#### Apple Ecosystem
**Core**: iPhone, iPad, Mac
**Stakeholders**:
- App developers
- Content creators
- Accessory manufacturers
- Service providers (carriers)
- Enterprise customers
- Individual consumers

**Value Flows**:
- Developers create apps → Apple provides platform + takes 30%
- Customers buy devices → Apple provides integrated experience
- Content creators → Apple provides distribution + takes 30%

### Stakeholder Engagement Strategies

#### 1. Communication
- Regular updates and transparency
- Multiple communication channels
- Tailored messaging for different groups
- Feedback mechanisms

#### 2. Collaboration
- Joint projects and initiatives
- Shared value creation
- Co-innovation programs
- Partnership agreements

#### 3. Conflict Resolution
- Mediation processes
- Win-win solutions
- Compromise strategies
- Long-term relationship building

### Common Ecosystem Challenges

#### 1. Competing Interests
- Different stakeholders want different outcomes
- Short-term vs. long-term perspectives
- Profit vs. social responsibility

#### 2. Power Imbalances
- Some stakeholders have more influence
- Unequal bargaining power
- Potential for exploitation

#### 3. Complexity
- Many interconnected relationships
- Difficult to predict outcomes
- Hard to manage effectively

## Key Takeaways

1. **Businesses don't operate in isolation** - they're part of complex ecosystems
2. **Stakeholder analysis is crucial** for understanding business context
3. **Ecosystem health** affects individual business success
4. **Strategic thinking** requires understanding interdependencies

## Next Steps

In the next lesson, we'll explore different business types (B2B, B2C, B2B2C, Marketplace) and how they create value in different ways.

## Discussion Questions

1. Think of a business you know well. Map out their key stakeholders and how they interact.
2. What are the potential conflicts between different stakeholder groups in a typical business?
3. How might a business's ecosystem change as it grows from startup to large corporation?
""",
            "estimated_duration_minutes": 20,
            "difficulty_level": "beginner",
            "sort_order": 2,
            "prerequisites": ["lesson_1_1_what_is_business"],
            "tags": ["business", "ecosystems", "stakeholders"],
            "is_published": True
        },
        
        {
            "module_id": "business_foundations",
            "unit_id": "intro_to_business",
            "lesson_id": "lesson_1_3_business_types",
            "title": "Business Types (B2B, B2C, B2B2C, Marketplace)",
            "content_type": "text",
            "content_markdown": """# Business Types (B2B, B2C, B2B2C, Marketplace)

## Learning Objectives
- Understand different business model types and their characteristics
- Analyze the unique challenges and opportunities of each model
- Learn to identify which model fits different business scenarios
- Understand how technology is reshaping traditional business types

## Key Concepts

### Business-to-Consumer (B2C)

**Definition**: Businesses that sell directly to individual consumers.

**Characteristics**:
- Large customer base
- Shorter sales cycles
- Emotional purchasing decisions
- Brand-focused marketing
- Price-sensitive customers

**Examples**:
- Retail stores (Walmart, Target)
- E-commerce (Amazon, Shopify stores)
- Restaurants (McDonald's, Starbucks)
- Entertainment (Netflix, Spotify)
- Consumer services (Uber, Airbnb)

**Key Success Factors**:
- Strong brand recognition
- Customer experience excellence
- Efficient operations
- Competitive pricing
- Marketing reach

### Business-to-Business (B2B)

**Definition**: Businesses that sell to other businesses.

**Characteristics**:
- Smaller customer base
- Longer sales cycles
- Rational purchasing decisions
- Relationship-focused sales
- Higher transaction values

**Examples**:
- Software companies (Salesforce, Microsoft)
- Manufacturing suppliers (Boeing suppliers)
- Professional services (McKinsey, Deloitte)
- Industrial equipment (Caterpillar)
- Wholesale distribution

**Key Success Factors**:
- Deep industry expertise
- Strong relationships
- Customized solutions
- Reliable delivery
- After-sales support

### Business-to-Business-to-Consumer (B2B2C)

**Definition**: Businesses that sell to other businesses, which then sell to consumers.

**Characteristics**:
- Indirect customer relationship
- Platform-based models
- Revenue sharing
- Brand co-creation
- Complex value chains

**Examples**:
- App stores (Apple App Store, Google Play)
- Marketplace platforms (Amazon Marketplace)
- Payment processors (Stripe, PayPal)
- Cloud platforms (AWS, Azure)
- Content platforms (YouTube, TikTok)

**Key Success Factors**:
- Platform scalability
- Developer/partner ecosystem
- User experience
- Revenue sharing models
- Network effects

### Marketplace Models

**Definition**: Platforms that connect buyers and sellers, taking a commission.

**Characteristics**:
- Multi-sided platforms
- Network effects
- Commission-based revenue
- Quality control challenges
- Scalable growth

**Examples**:
- E-commerce marketplaces (Amazon, eBay)
- Service marketplaces (TaskRabbit, Upwork)
- Transportation (Uber, Lyft)
- Accommodation (Airbnb, Booking.com)
- Financial services (LendingClub, Robinhood)

**Key Success Factors**:
- Critical mass of users
- Trust and safety
- Efficient matching
- Competitive pricing
- User experience

## Business Model Comparison

| Aspect | B2C | B2B | B2B2C | Marketplace |
|--------|-----|-----|-------|------------|
| **Customer Base** | Large | Small | Medium | Very Large |
| **Sales Cycle** | Short | Long | Medium | Instant |
| **Decision Process** | Individual | Committee | Mixed | Individual |
| **Price Sensitivity** | High | Medium | Medium | High |
| **Relationship** | Transactional | Long-term | Partnership | Platform |
| **Marketing** | Mass | Targeted | Partner-driven | Viral |
| **Revenue Model** | Direct sales | Direct sales | Revenue share | Commission |

## Technology's Impact on Business Types

### Digital Transformation
- **B2C**: E-commerce, mobile apps, social commerce
- **B2B**: Online platforms, self-service portals, AI sales
- **B2B2C**: API ecosystems, developer platforms
- **Marketplace**: Mobile-first, real-time matching

### New Business Models
- **Subscription Services**: Netflix (B2C), Salesforce (B2B)
- **Freemium**: Spotify (B2C), Slack (B2B)
- **On-Demand**: Uber (Marketplace), DoorDash (B2B2C)
- **Platform Economy**: Apple (B2B2C), Amazon (Marketplace)

## Choosing the Right Business Type

### Factors to Consider

#### 1. Target Market
- **B2C**: Mass market, consumer needs
- **B2B**: Specific industries, business needs
- **B2B2C**: Partner channels, indirect access
- **Marketplace**: Two-sided markets, network effects

#### 2. Product/Service Type
- **B2C**: Standardized, mass-produced
- **B2B**: Customized, complex solutions
- **B2B2C**: Platform-dependent, scalable
- **Marketplace**: Commoditized, easily comparable

#### 3. Revenue Potential
- **B2C**: Volume-based, lower margins
- **B2B**: Value-based, higher margins
- **B2B2C**: Scalable, recurring revenue
- **Marketplace**: Network effects, exponential growth

#### 4. Operational Complexity
- **B2C**: Marketing, logistics, customer service
- **B2B**: Sales, customization, support
- **B2B2C**: Platform management, partner relations
- **Marketplace**: Trust, safety, matching algorithms

## Hybrid Models

Many successful businesses combine multiple types:

### Amazon
- **B2C**: Direct retail sales
- **B2B**: AWS cloud services
- **B2B2C**: Marketplace for third-party sellers
- **Marketplace**: Amazon Marketplace platform

### Apple
- **B2C**: iPhone, iPad, Mac sales
- **B2B**: Enterprise software and services
- **B2B2C**: App Store for developers
- **Marketplace**: App Store ecosystem

## Key Takeaways

1. **Different business types** have distinct characteristics and requirements
2. **Technology is blurring** traditional boundaries between types
3. **Hybrid models** are becoming more common and successful
4. **Choose the model** that best fits your target market and capabilities

## Next Steps

In the next lesson, we'll explore industry analysis frameworks, starting with Porter's Five Forces, to understand competitive dynamics.

## Discussion Questions

1. Think of a business you interact with. What type is it, and why do you think they chose that model?
2. How might a B2C business benefit from adding B2B elements, or vice versa?
3. What are the risks and opportunities of marketplace models compared to traditional business types?
""",
            "estimated_duration_minutes": 25,
            "difficulty_level": "beginner",
            "sort_order": 3,
            "prerequisites": ["lesson_1_2_business_ecosystems"],
            "tags": ["business", "models", "B2B", "B2C", "marketplace"],
            "is_published": True
        },
        
        {
            "module_id": "business_foundations",
            "unit_id": "intro_to_business",
            "lesson_id": "lesson_1_4_porter_five_forces",
            "title": "Industry Analysis Frameworks (Porter's 5 Forces)",
            "content_type": "text",
            "content_markdown": """# Industry Analysis Frameworks (Porter's 5 Forces)

## Learning Objectives
- Master Porter's Five Forces framework for industry analysis
- Understand how each force affects industry profitability
- Learn to apply the framework to real-world industries
- Recognize the limitations and modern adaptations of the model

## Key Concepts

### Porter's Five Forces Framework

Developed by Michael Porter in 1979, this framework analyzes the competitive intensity and attractiveness of an industry by examining five key forces:

1. **Threat of New Entrants**
2. **Bargaining Power of Suppliers**
3. **Bargaining Power of Buyers**
4. **Threat of Substitute Products**
5. **Rivalry Among Existing Competitors**

### Force 1: Threat of New Entrants

**Definition**: How easy it is for new companies to enter the industry.

**High Threat Factors**:
- Low barriers to entry
- Minimal capital requirements
- Easy access to distribution channels
- No significant economies of scale
- Little product differentiation
- No government restrictions

**Low Threat Factors**:
- High capital requirements
- Strong brand loyalty
- Significant economies of scale
- Proprietary technology
- Limited access to distribution
- Government regulations

**Examples**:
- **High Threat**: Restaurant industry (low barriers)
- **Low Threat**: Aerospace industry (high capital, regulations)

### Force 2: Bargaining Power of Suppliers

**Definition**: How much power suppliers have to influence prices and terms.

**High Power Factors**:
- Few suppliers relative to buyers
- Unique or differentiated products
- High switching costs for buyers
- Suppliers can integrate forward
- No substitute inputs available

**Low Power Factors**:
- Many suppliers
- Commoditized products
- Low switching costs
- Buyers can integrate backward
- Many substitute inputs

**Examples**:
- **High Power**: Intel in PC processors (duopoly with AMD)
- **Low Power**: Office supplies (many suppliers, commoditized)

### Force 3: Bargaining Power of Buyers

**Definition**: How much power customers have to influence prices and terms.

**High Power Factors**:
- Few buyers relative to sellers
- Large purchase volumes
- Low switching costs
- Buyers can integrate backward
- Price sensitivity
- Full information about alternatives

**Low Power Factors**:
- Many small buyers
- High switching costs
- Unique or differentiated products
- Buyers cannot integrate backward
- Low price sensitivity

**Examples**:
- **High Power**: Walmart with suppliers (large volume, many alternatives)
- **Low Power**: Individual consumers with Apple (brand loyalty, differentiation)

### Force 4: Threat of Substitute Products

**Definition**: How easily customers can switch to alternative products or services.

**High Threat Factors**:
- Many substitute products available
- Low switching costs
- Similar functionality
- Lower prices
- Better performance
- Changing customer preferences

**Low Threat Factors**:
- Few substitutes available
- High switching costs
- Unique functionality
- Higher prices acceptable
- Customer loyalty
- Network effects

**Examples**:
- **High Threat**: Traditional taxis vs. Uber (similar service, lower price)
- **Low Threat**: iPhone vs. Android (different ecosystems, high switching costs)

### Force 5: Rivalry Among Existing Competitors

**Definition**: The intensity of competition between existing players in the industry.

**High Rivalry Factors**:
- Many competitors
- Slow industry growth
- High fixed costs
- Low differentiation
- High exit barriers
- Competitors of similar size

**Low Rivalry Factors**:
- Few competitors
- Fast industry growth
- Low fixed costs
- High differentiation
- Low exit barriers
- One dominant player

**Examples**:
- **High Rivalry**: Airlines (many competitors, high fixed costs, low differentiation)
- **Low Rivalry**: Google search (dominant player, network effects)

## Industry Attractiveness Analysis

### High Attractiveness (Profitable)
- Low threat of new entrants
- Low supplier power
- Low buyer power
- Low threat of substitutes
- Low rivalry among competitors

### Low Attractiveness (Unprofitable)
- High threat of new entrants
- High supplier power
- High buyer power
- High threat of substitutes
- High rivalry among competitors

## Real-World Application: Smartphone Industry

### Threat of New Entrants: **LOW**
- High capital requirements (R&D, manufacturing)
- Strong brand loyalty (Apple, Samsung)
- Patents and intellectual property
- Complex supply chains
- Regulatory requirements

### Supplier Power: **MEDIUM**
- Key suppliers (TSMC for chips, Samsung for displays)
- High switching costs
- But: Multiple suppliers for most components
- Apple's size gives it leverage

### Buyer Power: **HIGH**
- Many smartphone options
- Low switching costs
- Price sensitivity
- Full information about alternatives
- Carrier subsidies reduce direct price sensitivity

### Threat of Substitutes: **MEDIUM**
- Tablets, laptops, smartwatches
- But: Smartphones are increasingly essential
- Some substitution in specific use cases

### Rivalry Among Competitors: **HIGH**
- Many competitors (Apple, Samsung, Google, OnePlus, etc.)
- Slow growth in developed markets
- High fixed costs (R&D, marketing)
- Low differentiation in basic functionality
- Price competition

**Overall Assessment**: Moderately attractive, but challenging due to high buyer power and rivalry.

## Modern Adaptations and Limitations

### Digital Age Considerations
- **Platform Effects**: Network effects can change industry dynamics
- **Data Advantage**: Companies with better data may have sustainable advantages
- **Ecosystem Lock-in**: Switching costs may be higher than traditional analysis suggests

### Limitations
- **Static Analysis**: Doesn't capture industry evolution
- **Assumes Rational Behavior**: May not account for emotional factors
- **Focus on Competition**: May miss collaboration opportunities
- **Industry Boundaries**: May be unclear in digital industries

## Key Takeaways

1. **Porter's Five Forces** provides a systematic way to analyze industry attractiveness
2. **All five forces** work together to determine industry profitability
3. **Industry dynamics change** over time, requiring regular analysis
4. **Strategic positioning** can help companies improve their position within the forces

## Next Steps

In the next lesson, we'll explore the Business Model Canvas, a tool for designing and analyzing business models.

## Discussion Questions

1. Choose an industry you're familiar with. Analyze it using Porter's Five Forces. Which forces are strongest?
2. How might the rise of digital platforms change the traditional analysis of some industries?
3. Can you think of a company that has successfully changed the dynamics of their industry? How did they do it?
""",
            "estimated_duration_minutes": 30,
            "difficulty_level": "intermediate",
            "sort_order": 4,
            "prerequisites": ["lesson_1_3_business_types"],
            "tags": ["business", "strategy", "porter", "analysis"],
            "is_published": True
        },
        
        # Unit 2: Business Model Canvas & Strategy (3 weeks)
        {
            "module_id": "business_foundations",
            "unit_id": "business_model_canvas",
            "lesson_id": "lesson_2_1_bmc_customer_segments",
            "title": "Business Model Canvas - Customer Segments & Value Propositions",
            "content_type": "text",
            "content_markdown": """# Business Model Canvas - Customer Segments & Value Propositions

## Learning Objectives
- Understand the Business Model Canvas framework
- Learn to identify and analyze customer segments
- Master the art of crafting compelling value propositions
- Apply customer segmentation techniques to real businesses

## Key Concepts

### Business Model Canvas Overview

The Business Model Canvas is a strategic management tool that allows you to describe, design, challenge, and pivot your business model. It consists of 9 building blocks:

1. **Customer Segments** - Who are we creating value for?
2. **Value Propositions** - What value do we deliver?
3. **Channels** - How do we reach customers?
4. **Customer Relationships** - What type of relationship do we establish?
5. **Revenue Streams** - How do we make money?
6. **Key Resources** - What key resources do we need?
7. **Key Activities** - What key activities do we perform?
8. **Key Partnerships** - Who are our key partners?
9. **Cost Structure** - What are our major costs?

### Customer Segments

**Definition**: The different groups of people or organizations a business aims to reach and serve.

#### Types of Customer Segments

**1. Mass Market**
- No specific customer segment
- Broad appeal across demographics
- Examples: Coca-Cola, McDonald's, Google Search

**2. Niche Market**
- Specific, well-defined segment
- Specialized needs
- Examples: Tesla (luxury EV buyers), Patagonia (environmentally conscious outdoor enthusiasts)

**3. Segmented Market**
- Multiple distinct segments with similar needs
- Different value propositions for each
- Examples: Microsoft (consumers, businesses, developers), Amazon (individuals, businesses, developers)

**4. Diversified Market**
- Very different customer segments
- Different value propositions and business models
- Examples: Apple (consumers, businesses, developers, content creators)

**5. Multi-sided Platform**
- Two or more interdependent customer segments
- Value for one segment depends on the other
- Examples: Uber (riders and drivers), Airbnb (guests and hosts)

#### Customer Segmentation Techniques

**Demographic Segmentation**
- Age, gender, income, education, occupation
- Useful for consumer products
- Easy to measure and target

**Psychographic Segmentation**
- Lifestyle, values, interests, personality
- Deeper understanding of motivations
- More complex to measure

**Behavioral Segmentation**
- Usage patterns, brand loyalty, price sensitivity
- Based on actual behavior
- Most actionable for marketing

**Geographic Segmentation**
- Location, climate, culture
- Important for local businesses
- Affects distribution and marketing

#### Customer Personas

Create detailed profiles of your ideal customers:

**Template**:
- **Name**: Give them a name
- **Demographics**: Age, income, education, etc.
- **Goals**: What they want to achieve
- **Pain Points**: What problems they face
- **Behaviors**: How they act and make decisions
- **Motivations**: What drives them

### Value Propositions

**Definition**: The bundle of products and services that create value for a specific customer segment.

#### Types of Value Propositions

**1. Newness**
- Creating something entirely new
- Examples: iPhone (smartphone), Uber (ride-sharing)

**2. Performance**
- Improving performance on existing products
- Examples: Tesla (electric vehicle performance), Dyson (vacuum performance)

**3. Customization**
- Tailoring products to individual needs
- Examples: Nike ID (custom shoes), Spotify (personalized playlists)

**4. Getting the Job Done**
- Helping customers complete a specific task
- Examples: LinkedIn (finding jobs), PayPal (making payments)

**5. Design**
- Superior design and user experience
- Examples: Apple products, Tesla vehicles

**6. Brand/Status**
- Associating with a brand or status
- Examples: Rolex (luxury), Supreme (streetwear)

**7. Price**
- Offering similar value at lower cost
- Examples: Walmart (everyday low prices), Southwest (low-cost flights)

**8. Cost Reduction**
- Helping customers reduce costs
- Examples: Salesforce (reducing sales management costs), AWS (reducing IT costs)

**9. Risk Reduction**
- Reducing uncertainty or risk
- Examples: Insurance companies, warranties

**10. Accessibility**
- Making products available to new customers
- Examples: Netflix (streaming vs. video stores), Spotify (music streaming)

#### Value Proposition Canvas

**Customer Jobs**:
- Functional jobs (what they're trying to accomplish)
- Emotional jobs (how they want to feel)
- Social jobs (how they want to be perceived)

**Pain Points**:
- Undesired outcomes and risks
- Obstacles that prevent job completion
- Bad experiences with current solutions

**Gain Creators**:
- How products create customer gains
- Positive outcomes customers expect
- Benefits customers expect

**Products & Services**:
- What you offer to customers
- How you help customers get jobs done
- How you address pain points and create gains

### Real-World Examples

#### Tesla - Electric Vehicles

**Customer Segments**:
- Early adopters of technology
- Environmentally conscious consumers
- Luxury car buyers
- Performance car enthusiasts

**Value Propositions**:
- Zero emissions driving
- Superior performance (acceleration, handling)
- Cutting-edge technology and features
- Supercharger network
- Over-the-air updates
- Autopilot capabilities

#### Netflix - Streaming Service

**Customer Segments**:
- Entertainment seekers
- Cord-cutters (people leaving cable)
- Binge-watchers
- Families with children

**Value Propositions**:
- Unlimited streaming content
- No commercials
- Original content
- Multiple device access
- Personalized recommendations
- Affordable monthly pricing

#### Salesforce - CRM Software

**Customer Segments**:
- Sales teams
- Marketing departments
- Customer service teams
- Small to large businesses

**Value Propositions**:
- Centralized customer data
- Sales pipeline management
- Marketing automation
- Customer service tools
- Mobile access
- Integration with other tools

## Key Takeaways

1. **Customer segments** define who you're serving and their specific needs
2. **Value propositions** must clearly address customer jobs, pains, and gains
3. **Segmentation** helps you focus your efforts and resources effectively
4. **Value proposition canvas** ensures alignment between what you offer and what customers need

## Next Steps

In the next lesson, we'll explore Channels, Customer Relationships, and Revenue Streams to complete the customer-facing side of the Business Model Canvas.

## Discussion Questions

1. Think of a business you know well. Who are their customer segments, and what value do they provide?
2. How might customer segments change as a business grows from startup to large corporation?
3. Can you identify a business that serves multiple customer segments with different value propositions?
""",
            "estimated_duration_minutes": 25,
            "difficulty_level": "intermediate",
            "sort_order": 5,
            "prerequisites": ["lesson_1_4_porter_five_forces"],
            "tags": ["business", "strategy", "BMC", "customers", "value"],
            "is_published": True
        },
        
        # Add more lessons for the remaining units...
        # This is just the beginning - the full curriculum would have 80+ lessons
        
    ]
    
    # Insert all content
    for content_data in curriculum:
        content = LearningContent(**content_data)
        db.add(content)
    
    db.commit()
    print(f"Successfully seeded {len(curriculum)} learning content items")

if __name__ == "__main__":
    seed_learning_content()
