import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Globe, Menu, User, LogOut } from "lucide-react";
import { User as SupabaseUser } from '@supabase/supabase-js';

interface HeaderProps {
  onLanguageToggle: () => void;
  language: 'en' | 'hi';
  user?: SupabaseUser | null;
  onSignOut?: () => void;
}

export function Header({ onLanguageToggle, language, user, onSignOut }: HeaderProps) {
  return (
    <header className="bg-gradient-hero shadow-soft border-b">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="bg-primary-foreground p-2 rounded-lg">
              <div className="w-8 h-8 bg-gradient-primary rounded-md flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-lg">आ</span>
              </div>
            </div>
            <div>
              <h1 className="text-primary-foreground text-xl font-bold">
                {language === 'hi' ? 'आरोग्य अधिकार' : 'AarogyaAdhikar'}
              </h1>
              <p className="text-primary-foreground/80 text-sm">
                {language === 'hi' ? 'स्वास्थ्य अधिकार सहायक' : 'Healthcare Rights Assistant'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onLanguageToggle}
              className="text-primary-foreground hover:bg-primary-foreground/10"
            >
              <Globe className="w-4 h-4 mr-1" />
              {language === 'hi' ? 'EN' : 'हिं'}
            </Button>

            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full text-primary-foreground">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.user_metadata?.avatar_url} alt={user.email} />
                      <AvatarFallback className="bg-primary-foreground/20">
                        <User className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {user.user_metadata?.full_name || 'User'}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={onSignOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button asChild variant="ghost" size="sm" className="text-primary-foreground hover:bg-primary-foreground/10">
                <a href="/auth">Sign In</a>
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}