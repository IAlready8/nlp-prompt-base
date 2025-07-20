class AdvancedAnalytics {
    constructor(options = {}) {
        this.options = {
            enableRealTime: options.enableRealTime !== false,
            retentionDays: options.retentionDays || 90,
            enablePredictive: options.enablePredictive !== false,
            ...options
        };
        
        this.timeSeriesData = new Map();
        this.userMetrics = new Map();
        this.insights = [];
        this.logger = options.logger || console;
    }
    
    analyzeCollection(prompts, options = {}) {
        const analysis = {
            overview: this.generateOverview(prompts),
            categoryAnalysis: this.analyzeCategoriesAdvanced(prompts),
            qualityMetrics: this.analyzeQuality(prompts),
            usagePatterns: this.analyzeUsagePatterns(prompts),
            trendAnalysis: this.analyzeTrends(prompts),
            healthScore: this.calculateHealthScore(prompts),
            recommendations: this.generateCollectionRecommendations(prompts),
            insights: this.generateInsights(prompts),
            timestamp: new Date().toISOString()
        };
        
        this.storeTimeSeriesData(analysis);
        return analysis;
    }
    
    generateOverview(prompts) {
        const total = prompts.length;
        const categories = new Set(prompts.map(p => p.category)).size;
        const tags = new Set(prompts.flatMap(p => p.tags || [])).size;
        
        const ratings = prompts.filter(p => p.rating).map(p => p.rating);
        const avgRating = ratings.length ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length : 0;
        
        const totalUsage = prompts.reduce((sum, p) => sum + (p.usage_count || 0), 0);
        const avgUsage = total ? totalUsage / total : 0;
        
        const creationDates = prompts.map(p => new Date(p.createdAt)).filter(d => !isNaN(d));
        const firstPrompt = creationDates.length ? new Date(Math.min(...creationDates)) : null;
        const lastPrompt = creationDates.length ? new Date(Math.max(...creationDates)) : null;
        
        return {
            totalPrompts: total,
            totalCategories: categories,
            totalTags: tags,
            averageRating: Math.round(avgRating * 100) / 100,
            totalUsage: totalUsage,
            averageUsage: Math.round(avgUsage * 100) / 100,
            collectionAge: firstPrompt && lastPrompt ? 
                Math.round((lastPrompt - firstPrompt) / (1000 * 60 * 60 * 24)) : 0,
            lastActivity: lastPrompt ? lastPrompt.toISOString() : null
        };
    }
    
    analyzeCategoriesAdvanced(prompts) {
        const categoryStats = new Map();
        
        prompts.forEach(prompt => {
            const category = prompt.category;
            if (!categoryStats.has(category)) {
                categoryStats.set(category, {
                    count: 0,
                    totalRating: 0,
                    ratedCount: 0,
                    totalUsage: 0,
                    avgLength: 0,
                    tags: new Set(),
                    creationDates: [],
                    qualityScore: 0
                });
            }
            
            const stats = categoryStats.get(category);
            stats.count++;
            
            if (prompt.rating) {
                stats.totalRating += prompt.rating;
                stats.ratedCount++;
            }
            
            stats.totalUsage += prompt.usage_count || 0;
            stats.avgLength += prompt.text.length;
            
            (prompt.tags || []).forEach(tag => stats.tags.add(tag));
            
            if (prompt.createdAt) {
                stats.creationDates.push(new Date(prompt.createdAt));
            }
        });
        
        const result = {};
        categoryStats.forEach((stats, category) => {
            const avgRating = stats.ratedCount ? stats.totalRating / stats.ratedCount : 0;
            const avgUsage = stats.count ? stats.totalUsage / stats.count : 0;
            const avgLength = stats.count ? stats.avgLength / stats.count : 0;
            
            const recentActivity = stats.creationDates.length ?
                this.calculateRecentActivity(stats.creationDates) : 0;
            
            result[category] = {
                count: stats.count,
                percentage: Math.round((stats.count / prompts.length) * 100),
                averageRating: Math.round(avgRating * 100) / 100,
                averageUsage: Math.round(avgUsage * 100) / 100,
                averageLength: Math.round(avgLength),
                uniqueTags: stats.tags.size,
                recentActivity: recentActivity,
                qualityScore: this.calculateCategoryQualityScore({
                    avgRating,
                    avgUsage,
                    tagDiversity: stats.tags.size / stats.count,
                    recentActivity
                })
            };
        });
        
        return result;
    }
    
    analyzeQuality(prompts) {
        const qualityMetrics = {
            ratingDistribution: {},
            lengthAnalysis: {},
            completenessScore: 0,
            diversityScore: 0,
            engagementScore: 0
        };
        
        // Rating distribution
        for (let i = 1; i <= 5; i++) {
            qualityMetrics.ratingDistribution[i] = prompts.filter(p => p.rating === i).length;
        }
        qualityMetrics.ratingDistribution['unrated'] = prompts.filter(p => !p.rating).length;
        
        // Length analysis
        const lengths = prompts.map(p => p.text.length);
        qualityMetrics.lengthAnalysis = {
            average: lengths.reduce((sum, len) => sum + len, 0) / lengths.length,
            median: this.calculateMedian(lengths),
            min: Math.min(...lengths),
            max: Math.max(...lengths),
            distribution: {
                short: lengths.filter(len => len < 100).length,
                medium: lengths.filter(len => len >= 100 && len < 500).length,
                long: lengths.filter(len => len >= 500).length
            }
        };
        
        // Completeness score (how well-filled the prompts are)
        const completenessFactors = prompts.map(prompt => {
            let score = 0;
            if (prompt.text && prompt.text.length > 20) score += 0.3;
            if (prompt.category && prompt.category !== 'General') score += 0.2;
            if (prompt.tags && prompt.tags.length > 0) score += 0.2;
            if (prompt.rating) score += 0.15;
            if (prompt.notes && prompt.notes.length > 0) score += 0.15;
            return score;
        });
        qualityMetrics.completenessScore = completenessFactors.reduce((sum, score) => sum + score, 0) / prompts.length;
        
        // Diversity score
        const categories = new Set(prompts.map(p => p.category)).size;
        const tags = new Set(prompts.flatMap(p => p.tags || [])).size;
        qualityMetrics.diversityScore = Math.min((categories * 0.1) + (tags * 0.01), 1);
        
        // Engagement score (based on usage)
        const usageCounts = prompts.map(p => p.usage_count || 0);
        const totalUsage = usageCounts.reduce((sum, count) => sum + count, 0);
        const avgUsage = totalUsage / prompts.length;
        qualityMetrics.engagementScore = Math.min(avgUsage / 10, 1); // Normalize to 0-1
        
        return qualityMetrics;
    }
    
    analyzeUsagePatterns(prompts) {
        const patterns = {
            temporal: this.analyzeTemporalPatterns(prompts),
            frequency: this.analyzeFrequencyPatterns(prompts),
            correlation: this.analyzeCorrelationPatterns(prompts)
        };
        
        return patterns;
    }
    
    analyzeTemporalPatterns(prompts) {
        const hourlyUsage = new Array(24).fill(0);
        const dailyUsage = new Array(7).fill(0);
        const monthlyCreation = new Map();
        
        prompts.forEach(prompt => {
            if (prompt.lastUsed) {
                const date = new Date(prompt.lastUsed);
                hourlyUsage[date.getHours()]++;
                dailyUsage[date.getDay()]++;
            }
            
            if (prompt.createdAt) {
                const month = prompt.createdAt.substring(0, 7); // YYYY-MM
                monthlyCreation.set(month, (monthlyCreation.get(month) || 0) + 1);
            }
        });
        
        return {
            hourlyDistribution: hourlyUsage,
            weeklyDistribution: dailyUsage,
            monthlyGrowth: Array.from(monthlyCreation.entries()).sort(),
            peakHour: hourlyUsage.indexOf(Math.max(...hourlyUsage)),
            peakDay: dailyUsage.indexOf(Math.max(...dailyUsage))
        };
    }
    
    analyzeFrequencyPatterns(prompts) {
        const usageCounts = prompts.map(p => p.usage_count || 0);
        const frequentlyUsed = prompts.filter(p => (p.usage_count || 0) > 5);
        const neverUsed = prompts.filter(p => (p.usage_count || 0) === 0);
        
        return {
            totalUsage: usageCounts.reduce((sum, count) => sum + count, 0),
            averageUsage: usageCounts.reduce((sum, count) => sum + count, 0) / prompts.length,
            mostUsed: prompts.sort((a, b) => (b.usage_count || 0) - (a.usage_count || 0)).slice(0, 5),
            frequentlyUsed: frequentlyUsed.length,
            neverUsed: neverUsed.length,
            usageDistribution: this.calculateUsageDistribution(usageCounts)
        };
    }
    
    analyzeCorrelationPatterns(prompts) {
        const correlations = {
            ratingVsUsage: this.calculateCorrelation(
                prompts.map(p => p.rating || 0),
                prompts.map(p => p.usage_count || 0)
            ),
            lengthVsRating: this.calculateCorrelation(
                prompts.map(p => p.text.length),
                prompts.map(p => p.rating || 0)
            ),
            tagsVsUsage: this.calculateCorrelation(
                prompts.map(p => (p.tags || []).length),
                prompts.map(p => p.usage_count || 0)
            )
        };
        
        return correlations;
    }
    
    analyzeTrends(prompts) {
        const trends = {
            growth: this.analyzeGrowthTrend(prompts),
            categories: this.analyzeCategoryTrends(prompts),
            quality: this.analyzeQualityTrend(prompts),
            engagement: this.analyzeEngagementTrend(prompts)
        };
        
        return trends;
    }
    
    analyzeGrowthTrend(prompts) {
        const monthlyData = new Map();
        
        prompts.forEach(prompt => {
            if (prompt.createdAt) {
                const month = prompt.createdAt.substring(0, 7);
                monthlyData.set(month, (monthlyData.get(month) || 0) + 1);
            }
        });
        
        const sortedData = Array.from(monthlyData.entries()).sort();
        const trend = this.calculateTrendDirection(sortedData.map(([, count]) => count));
        
        return {
            monthlyGrowth: sortedData,
            trend: trend,
            growthRate: this.calculateGrowthRate(sortedData),
            projection: this.projectGrowth(sortedData)
        };
    }
    
    calculateHealthScore(prompts) {
        let score = 0;
        const weights = {
            diversity: 0.25,
            quality: 0.25,
            engagement: 0.25,
            completeness: 0.25
        };
        
        // Diversity score
        const categories = new Set(prompts.map(p => p.category)).size;
        const diversityScore = Math.min(categories / 10, 1); // Perfect at 10+ categories
        score += diversityScore * weights.diversity;
        
        // Quality score (average rating)
        const ratings = prompts.filter(p => p.rating).map(p => p.rating);
        const qualityScore = ratings.length ? (ratings.reduce((sum, r) => sum + r, 0) / ratings.length) / 5 : 0.5;
        score += qualityScore * weights.quality;
        
        // Engagement score (usage)
        const avgUsage = prompts.reduce((sum, p) => sum + (p.usage_count || 0), 0) / prompts.length;
        const engagementScore = Math.min(avgUsage / 5, 1); // Perfect at 5+ avg usage
        score += engagementScore * weights.engagement;
        
        // Completeness score
        const completenessScore = prompts.reduce((sum, prompt) => {
            let itemScore = 0;
            if (prompt.text.length > 20) itemScore += 0.4;
            if (prompt.tags && prompt.tags.length > 0) itemScore += 0.3;
            if (prompt.rating) itemScore += 0.2;
            if (prompt.notes) itemScore += 0.1;
            return sum + itemScore;
        }, 0) / prompts.length;
        score += completenessScore * weights.completeness;
        
        return {
            overall: Math.round(score * 100),
            breakdown: {
                diversity: Math.round(diversityScore * 100),
                quality: Math.round(qualityScore * 100),
                engagement: Math.round(engagementScore * 100),
                completeness: Math.round(completenessScore * 100)
            },
            grade: this.scoreToGrade(score)
        };
    }
    
    generateCollectionRecommendations(prompts) {
        const recommendations = [];
        
        // Check category balance
        const categories = new Map();
        prompts.forEach(p => categories.set(p.category, (categories.get(p.category) || 0) + 1));
        
        if (categories.size < 5) {
            recommendations.push({
                type: 'diversity',
                priority: 'high',
                title: 'Increase Category Diversity',
                description: 'Consider adding prompts from underrepresented categories',
                action: 'Add prompts from categories like Creative, Analysis, or Research'
            });
        }
        
        // Check for unrated prompts
        const unrated = prompts.filter(p => !p.rating).length;
        if (unrated > prompts.length * 0.3) {
            recommendations.push({
                type: 'quality',
                priority: 'medium',
                title: 'Rate Your Prompts',
                description: `${unrated} prompts are missing ratings`,
                action: 'Add ratings to help identify your best prompts'
            });
        }
        
        // Check for unused prompts
        const unused = prompts.filter(p => (p.usage_count || 0) === 0).length;
        if (unused > prompts.length * 0.4) {
            recommendations.push({
                type: 'engagement',
                priority: 'medium',
                title: 'Utilize Dormant Prompts',
                description: `${unused} prompts have never been used`,
                action: 'Review and try using older prompts, or consider archiving them'
            });
        }
        
        // Check for missing tags
        const untagged = prompts.filter(p => !p.tags || p.tags.length === 0).length;
        if (untagged > prompts.length * 0.5) {
            recommendations.push({
                type: 'organization',
                priority: 'low',
                title: 'Add Tags for Better Organization',
                description: `${untagged} prompts are missing tags`,
                action: 'Add relevant tags to improve searchability'
            });
        }
        
        return recommendations;
    }
    
    generateInsights(prompts) {
        const insights = [];
        
        // Most productive category
        const categoryUsage = new Map();
        prompts.forEach(p => {
            const usage = p.usage_count || 0;
            categoryUsage.set(p.category, (categoryUsage.get(p.category) || 0) + usage);
        });
        
        const topCategory = Array.from(categoryUsage.entries())
            .sort((a, b) => b[1] - a[1])[0];
        
        if (topCategory) {
            insights.push({
                type: 'productivity',
                title: 'Most Productive Category',
                description: `Your ${topCategory[0]} prompts have been used ${topCategory[1]} times total`,
                value: topCategory[0],
                metric: topCategory[1]
            });
        }
        
        // Quality trend
        const ratedPrompts = prompts.filter(p => p.rating && p.createdAt);
        if (ratedPrompts.length > 5) {
            const recent = ratedPrompts
                .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                .slice(0, Math.floor(ratedPrompts.length / 2));
            
            const older = ratedPrompts.slice(Math.floor(ratedPrompts.length / 2));
            
            const recentAvg = recent.reduce((sum, p) => sum + p.rating, 0) / recent.length;
            const olderAvg = older.reduce((sum, p) => sum + p.rating, 0) / older.length;
            
            const improvement = recentAvg - olderAvg;
            
            if (Math.abs(improvement) > 0.2) {
                insights.push({
                    type: 'quality',
                    title: improvement > 0 ? 'Quality Improving' : 'Quality Declining',
                    description: `Your recent prompts are ${improvement > 0 ? 'better' : 'lower'} rated than older ones`,
                    value: improvement > 0 ? 'improving' : 'declining',
                    metric: Math.abs(improvement).toFixed(2)
                });
            }
        }
        
        // Usage patterns
        const totalUsage = prompts.reduce((sum, p) => sum + (p.usage_count || 0), 0);
        const topUsed = prompts
            .filter(p => p.usage_count > 0)
            .sort((a, b) => b.usage_count - a.usage_count)
            .slice(0, 5);
        
        if (topUsed.length > 0) {
            const topUsage = topUsed.reduce((sum, p) => sum + p.usage_count, 0);
            const percentage = Math.round((topUsage / totalUsage) * 100);
            
            insights.push({
                type: 'usage',
                title: 'Power Users',
                description: `Your top 5 prompts account for ${percentage}% of all usage`,
                value: 'concentrated',
                metric: percentage
            });
        }
        
        return insights;
    }
    
    // Utility methods
    calculateMedian(numbers) {
        const sorted = [...numbers].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
    }
    
    calculateCorrelation(x, y) {
        const n = x.length;
        const sumX = x.reduce((sum, val) => sum + val, 0);
        const sumY = y.reduce((sum, val) => sum + val, 0);
        const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
        const sumXX = x.reduce((sum, val) => sum + val * val, 0);
        const sumYY = y.reduce((sum, val) => sum + val * val, 0);
        
        const correlation = (n * sumXY - sumX * sumY) / 
            Math.sqrt((n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY));
        
        return isNaN(correlation) ? 0 : correlation;
    }
    
    calculateTrendDirection(values) {
        if (values.length < 2) return 'stable';
        
        const slope = this.calculateLinearSlope(values);
        
        if (slope > 0.1) return 'increasing';
        if (slope < -0.1) return 'decreasing';
        return 'stable';
    }
    
    calculateLinearSlope(values) {
        const n = values.length;
        const x = Array.from({length: n}, (_, i) => i);
        const sumX = x.reduce((sum, val) => sum + val, 0);
        const sumY = values.reduce((sum, val) => sum + val, 0);
        const sumXY = x.reduce((sum, val, i) => sum + val * values[i], 0);
        const sumXX = x.reduce((sum, val) => sum + val * val, 0);
        
        return (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    }
    
    calculateGrowthRate(monthlyData) {
        if (monthlyData.length < 2) return 0;
        
        const first = monthlyData[0][1];
        const last = monthlyData[monthlyData.length - 1][1];
        const months = monthlyData.length - 1;
        
        return months > 0 ? Math.pow(last / first, 1 / months) - 1 : 0;
    }
    
    projectGrowth(monthlyData) {
        if (monthlyData.length < 3) return null;
        
        const values = monthlyData.map(([, count]) => count);
        const growthRate = this.calculateGrowthRate(monthlyData);
        const lastValue = values[values.length - 1];
        
        return {
            nextMonth: Math.round(lastValue * (1 + growthRate)),
            nextQuarter: Math.round(lastValue * Math.pow(1 + growthRate, 3)),
            confidence: Math.min(values.length / 12, 1) // More data = higher confidence
        };
    }
    
    calculateUsageDistribution(usageCounts) {
        const max = Math.max(...usageCounts);
        const buckets = Math.min(10, max + 1);
        const distribution = new Array(buckets).fill(0);
        
        usageCounts.forEach(count => {
            const bucket = Math.min(Math.floor(count / (max / buckets)), buckets - 1);
            distribution[bucket]++;
        });
        
        return distribution;
    }
    
    calculateCategoryQualityScore(stats) {
        let score = 0;
        score += (stats.avgRating / 5) * 0.4;
        score += Math.min(stats.avgUsage / 10, 1) * 0.3;
        score += Math.min(stats.tagDiversity, 1) * 0.2;
        score += Math.min(stats.recentActivity, 1) * 0.1;
        return Math.round(score * 100);
    }
    
    calculateRecentActivity(dates) {
        const now = Date.now();
        const monthAgo = now - (30 * 24 * 60 * 60 * 1000);
        const recentCount = dates.filter(date => date.getTime() > monthAgo).length;
        return recentCount / dates.length;
    }
    
    scoreToGrade(score) {
        if (score >= 0.9) return 'A+';
        if (score >= 0.8) return 'A';
        if (score >= 0.7) return 'B+';
        if (score >= 0.6) return 'B';
        if (score >= 0.5) return 'C+';
        if (score >= 0.4) return 'C';
        return 'D';
    }
    
    storeTimeSeriesData(analysis) {
        const timestamp = Date.now();
        const key = new Date(timestamp).toISOString().substring(0, 10); // YYYY-MM-DD
        
        this.timeSeriesData.set(key, {
            timestamp,
            totalPrompts: analysis.overview.totalPrompts,
            avgRating: analysis.overview.averageRating,
            healthScore: analysis.healthScore.overall,
            categories: Object.keys(analysis.categoryAnalysis).length
        });
        
        // Keep only recent data
        const cutoff = timestamp - (this.options.retentionDays * 24 * 60 * 60 * 1000);
        for (const [key, data] of this.timeSeriesData.entries()) {
            if (data.timestamp < cutoff) {
                this.timeSeriesData.delete(key);
            }
        }
    }
    
    getHistoricalData(days = 30) {
        const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
        
        return Array.from(this.timeSeriesData.entries())
            .filter(([, data]) => data.timestamp > cutoff)
            .sort((a, b) => a[1].timestamp - b[1].timestamp)
            .map(([date, data]) => ({ date, ...data }));
    }
    
    exportAnalytics() {
        return {
            timeSeriesData: Array.from(this.timeSeriesData.entries()),
            userMetrics: Array.from(this.userMetrics.entries()),
            insights: this.insights,
            metadata: {
                retentionDays: this.options.retentionDays,
                dataPoints: this.timeSeriesData.size,
                exportedAt: new Date().toISOString()
            }
        };
    }
    
    importAnalytics(data) {
        if (data.timeSeriesData) {
            this.timeSeriesData = new Map(data.timeSeriesData);
        }
        if (data.userMetrics) {
            this.userMetrics = new Map(data.userMetrics);
        }
        if (data.insights) {
            this.insights = data.insights;
        }
    }
}

module.exports = AdvancedAnalytics;