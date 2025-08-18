import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LucideIcon } from "lucide-react";

interface FeatureCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  buttonText: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'accent';
  className?: string;
}

export function FeatureCard({ 
  title, 
  description, 
  icon: Icon, 
  buttonText, 
  onClick, 
  variant = 'primary',
  className = ""
}: FeatureCardProps) {
  const getVariantStyles = () => {
    switch (variant) {
      case 'secondary':
        return {
          cardClass: "bg-gradient-to-br from-secondary/5 to-secondary/10 hover:from-secondary/10 hover:to-secondary/15",
          iconBg: "bg-secondary/10",
          iconColor: "text-secondary",
          button: "secondary" as const
        };
      case 'accent':
        return {
          cardClass: "bg-gradient-to-br from-accent/5 to-accent/10 hover:from-accent/10 hover:to-accent/15",
          iconBg: "bg-accent/10",
          iconColor: "text-accent",
          button: "accent" as const
        };
      default:
        return {
          cardClass: "bg-gradient-to-br from-primary/5 to-primary/10 hover:from-primary/10 hover:to-primary/15",
          iconBg: "bg-primary/10",
          iconColor: "text-primary",
          button: "default" as const
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <Card className={`p-6 hover:shadow-elevated transition-all duration-300 cursor-pointer animate-slide-up ${styles.cardClass} ${className}`}>
      <div className="space-y-4">
        <div className={`${styles.iconBg} p-3 rounded-lg w-fit`}>
          <Icon className={`w-8 h-8 ${styles.iconColor}`} />
        </div>
        
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-foreground">{title}</h3>
          <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>
        </div>
        
        <Button 
          variant={styles.button}
          onClick={onClick}
          className="w-full transition-transform hover:scale-105"
        >
          {buttonText}
        </Button>
      </div>
    </Card>
  );
}