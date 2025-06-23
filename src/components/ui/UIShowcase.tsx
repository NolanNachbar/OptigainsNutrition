import React from 'react';
import { Card, MetricCard, CardGroup } from './Card';
import { Button, ButtonGroup } from './Button';
import { ProgressRing, MultiProgressRing, MiniProgressRing } from './ProgressRing';
import { theme } from '../../styles/theme';

// Example component to showcase the new UI components
export const UIShowcase: React.FC = () => {
  return (
    <div style={{ padding: theme.spacing[8], maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: theme.spacing[8], textAlign: 'center' }}>
        OptiGains UI Components
      </h1>
      
      {/* Cards Section */}
      <section style={{ marginBottom: theme.spacing[12] }}>
        <h2 style={{ marginBottom: theme.spacing[6] }}>Cards</h2>
        
        <CardGroup columns={3} gap="lg">
          <Card variant="default" padding="lg">
            <h3>Default Card</h3>
            <p style={{ marginTop: theme.spacing[2] }}>
              This is a default card with subtle styling and hover effects.
            </p>
          </Card>
          
          <Card variant="glass" padding="lg" hover>
            <h3>Glass Card</h3>
            <p style={{ marginTop: theme.spacing[2] }}>
              This card uses glass morphism for a premium look.
            </p>
          </Card>
          
          <Card variant="elevated" padding="lg" hover>
            <h3>Elevated Card</h3>
            <p style={{ marginTop: theme.spacing[2] }}>
              This card appears elevated with deeper shadows.
            </p>
          </Card>
        </CardGroup>
        
        <div style={{ marginTop: theme.spacing[6] }}>
          <CardGroup columns={4} gap="md">
            <MetricCard
              title="Calories"
              value="2,450"
              subtitle="Daily target"
              trend={{ value: 5.2, isPositive: true }}
              icon={
                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M10 2C10 2 14 6 14 10C14 14 10 18 10 18C10 18 6 14 6 10C6 6 10 2 10 2Z" />
                </svg>
              }
            />
            
            <MetricCard
              title="Protein"
              value="186g"
              subtitle="Daily intake"
              trend={{ value: 2.1, isPositive: true }}
            />
            
            <MetricCard
              title="Weight"
              value="175.5"
              subtitle="lbs"
              trend={{ value: 0.8, isPositive: false }}
            />
            
            <MetricCard
              title="Workouts"
              value="4"
              subtitle="This week"
            />
          </CardGroup>
        </div>
      </section>
      
      {/* Buttons Section */}
      <section style={{ marginBottom: theme.spacing[12] }}>
        <h2 style={{ marginBottom: theme.spacing[6] }}>Buttons</h2>
        
        <div style={{ marginBottom: theme.spacing[4] }}>
          <h4 style={{ marginBottom: theme.spacing[3] }}>Variants</h4>
          <ButtonGroup>
            <Button variant="primary">Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="danger">Danger</Button>
          </ButtonGroup>
        </div>
        
        <div style={{ marginBottom: theme.spacing[4] }}>
          <h4 style={{ marginBottom: theme.spacing[3] }}>Sizes</h4>
          <ButtonGroup>
            <Button size="sm">Small</Button>
            <Button size="md">Medium</Button>
            <Button size="lg">Large</Button>
          </ButtonGroup>
        </div>
        
        <div style={{ marginBottom: theme.spacing[4] }}>
          <h4 style={{ marginBottom: theme.spacing[3] }}>States</h4>
          <ButtonGroup>
            <Button loading>Loading</Button>
            <Button disabled>Disabled</Button>
            <Button 
              icon={
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M8 2L10 6L14 7L11 10L12 14L8 12L4 14L5 10L2 7L6 6L8 2Z" />
                </svg>
              }
            >
              With Icon
            </Button>
          </ButtonGroup>
        </div>
        
        <div style={{ marginBottom: theme.spacing[4] }}>
          <h4 style={{ marginBottom: theme.spacing[3] }}>Icon Buttons</h4>
          <ButtonGroup>
            <Button
              variant="primary"
              size="sm"
              icon={
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M8 3V13M3 8H13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              }
              style={{ width: '32px', height: '32px', padding: 0 }}
            />
            <Button
              variant="secondary"
              size="md"
              icon={
                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M10 5V15M5 10H15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              }
              style={{ width: '40px', height: '40px', padding: 0 }}
            />
            <Button
              variant="ghost"
              size="lg"
              icon={
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 6V18M6 12H18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              }
              style={{ width: '48px', height: '48px', padding: 0 }}
            />
          </ButtonGroup>
        </div>
      </section>
      
      {/* Progress Rings Section */}
      <section style={{ marginBottom: theme.spacing[12] }}>
        <h2 style={{ marginBottom: theme.spacing[6] }}>Progress Rings</h2>
        
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: theme.spacing[6],
          marginBottom: theme.spacing[8]
        }}>
          <div style={{ textAlign: 'center' }}>
            <ProgressRing value={75} label="Daily Goal" />
            <p style={{ marginTop: theme.spacing[3], fontSize: theme.typography.fontSize.sm }}>
              Standard progress ring
            </p>
          </div>
          
          <div style={{ textAlign: 'center' }}>
            <ProgressRing 
              value={62} 
              size={100} 
              strokeWidth={6}
              color={theme.colors.semantic.success}
              label="Protein" 
            />
            <p style={{ marginTop: theme.spacing[3], fontSize: theme.typography.fontSize.sm }}>
              Custom color and size
            </p>
          </div>
          
          <div style={{ textAlign: 'center' }}>
            <ProgressRing 
              value={90} 
              size={140} 
              strokeWidth={10}
              color={theme.colors.semantic.warning}
              showValue={true}
            />
            <p style={{ marginTop: theme.spacing[3], fontSize: theme.typography.fontSize.sm }}>
              Large ring
            </p>
          </div>
        </div>
        
        <div style={{ marginBottom: theme.spacing[8] }}>
          <h4 style={{ marginBottom: theme.spacing[4] }}>Multi Progress Ring</h4>
          <div style={{ maxWidth: '300px' }}>
            <MultiProgressRing
              values={[
                { value: 35, color: theme.colors.semantic.success, label: 'Protein' },
                { value: 25, color: theme.colors.primary[500], label: 'Carbs' },
                { value: 20, color: theme.colors.semantic.warning, label: 'Fats' },
              ]}
              size={160}
              strokeWidth={12}
            />
          </div>
        </div>
        
        <div>
          <h4 style={{ marginBottom: theme.spacing[3] }}>Mini Progress Rings</h4>
          <div style={{ display: 'flex', gap: theme.spacing[4], alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[2] }}>
              <MiniProgressRing value={80} />
              <span>Calories: 80%</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[2] }}>
              <MiniProgressRing value={65} color={theme.colors.semantic.success} />
              <span>Protein: 65%</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[2] }}>
              <MiniProgressRing value={45} color={theme.colors.semantic.warning} />
              <span>Hydration: 45%</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};