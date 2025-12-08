using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace Sayanho.Backend.Filters
{
    public class ModelBindingExceptionFilter : IExceptionFilter
    {
        public void OnException(ExceptionContext context)
        {
            Console.WriteLine($"Exception during model binding: {context.Exception.GetType().Name}");
            Console.WriteLine($"Message: {context.Exception.Message}");
            Console.WriteLine($"Stack trace: {context.Exception.StackTrace}");
            
            if (context.Exception.InnerException != null)
            {
                Console.WriteLine($"Inner exception: {context.Exception.InnerException.Message}");
            }
        }
    }
}
