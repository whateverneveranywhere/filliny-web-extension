import { Button } from './button';
import { DropdownMenuItem, DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from './dropdown-menu';
import { useTheme } from './theme-provider';
import { Theme } from '@extension/shared';
import { Moon, Sun, Monitor } from 'lucide-react';

export const ModeToggle = () => {
  const { setTheme, theme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="filliny-size-8 filliny-p-2" size="icon">
          {theme === Theme.DARK ? (
            <Moon className="filliny-h-[1.2rem] filliny-w-[1.2rem] filliny-transition-all" />
          ) : theme === Theme.SYSTEM ? (
            <Monitor className="filliny-h-[1.2rem] filliny-w-[1.2rem] filliny-transition-all" />
          ) : (
            <Sun className="filliny-h-[1.2rem] filliny-w-[1.2rem] filliny-transition-all" />
          )}
          <span className="filliny-sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme(Theme.LIGHT)}>Light</DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme(Theme.DARK)}>Dark</DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme(Theme.SYSTEM)}>System</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
